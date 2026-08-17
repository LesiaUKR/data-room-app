import {
  Action,
  type BreadcrumbsResponse,
  type ContentsResponse,
  ErrorCode,
  type Folder,
  type SubtreeStats,
} from '@data-room/contracts';

import { normalizeName } from '../../libs/helpers/index.js';
import { type AccessPolicy, ResourceKind } from '../../libs/modules/access/index.js';
import { lockDataRoom, transaction } from '../../libs/modules/database/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Actor } from '../../libs/types/index.js';
import { type FolderRepository } from './folder.repository.js';
import { FolderErrorMessage, FolderLimit } from './libs/enums/index.js';
import { FolderError } from './libs/exceptions/index.js';
import { decodeFolderCursor, LIST_START } from './libs/helpers/index.js';
import { type FolderWithOwner } from './libs/types/index.js';

type FolderServiceParameters = {
  accessPolicy: AccessPolicy;
  folderRepository: FolderRepository;
};

type ReadRequest = {
  actor: Actor;
  folderId: string;
};

type ListRequest = ReadRequest & {
  limit: number;
  cursor: string | undefined;
};

type CreateRequest = {
  actor: Actor;
  parentFolderId: string;
  name: string;
};

type RenameRequest = ReadRequest & {
  name: string;
};

class FolderService {
  private readonly accessPolicy: AccessPolicy;

  private readonly folderRepository: FolderRepository;

  public constructor({ accessPolicy, folderRepository }: FolderServiceParameters) {
    this.accessPolicy = accessPolicy;
    this.folderRepository = folderRepository;
  }

  public async getContents(request: ListRequest): Promise<ContentsResponse> {
    const { folder } = await this.authorize(request.actor, request.folderId, Action.FOLDER_READ);

    const position =
      request.cursor === undefined
        ? LIST_START
        : decodeFolderCursor(request.cursor, request.folderId);

    const page = await this.folderRepository.listContents({
      dataRoomId: folder.getDataRoomId(),
      folderId: request.folderId,
      limit: request.limit,
      position,
    });

    return {
      items: page.entries.map((entry) => ({ ...entry, updatedAt: entry.updatedAt.toISOString() })),
      nextCursor: page.nextCursor,
    };
  }

  public async getBreadcrumbs(request: ReadRequest): Promise<BreadcrumbsResponse> {
    await this.authorize(request.actor, request.folderId, Action.FOLDER_READ);

    const items = await this.folderRepository.findAncestors(request.folderId);

    return { items };
  }

  public async getSubtreeStats(request: ReadRequest): Promise<SubtreeStats> {
    await this.authorize(request.actor, request.folderId, Action.FOLDER_READ);

    return this.folderRepository.findSubtreeStats(request.folderId);
  }

  public async create(request: CreateRequest): Promise<Folder> {
    const { folder: parent } = await this.authorize(
      request.actor,
      request.parentFolderId,
      Action.FOLDER_CREATE,
    );

    const depth = parent.getDepth() + 1;

    if (depth > FolderLimit.MAX_DEPTH) {
      throw this.depthLimitError();
    }

    const normalizedName = this.toNormalizedName(request.name);
    const dataRoomId = parent.getDataRoomId();

    const created = await transaction(async (tx) => {
      await lockDataRoom(dataRoomId, tx);

      // Re-read under the lock: the parent may have been deleted while the lock was waited for
      const stillActive = await this.folderRepository.findWithOwner(request.parentFolderId, tx);

      if (stillActive === null) {
        throw this.notFoundError();
      }

      const taken = await this.folderRepository.findIdByNormalizedName(
        { parentFolderId: request.parentFolderId, normalizedName },
        tx,
      );

      if (taken !== null) {
        throw this.nameTakenError();
      }

      return this.folderRepository.create(
        {
          dataRoomId,
          parentFolderId: request.parentFolderId,
          name: request.name,
          normalizedName,
          depth,
        },
        tx,
      );
    });

    if (created === null) {
      throw this.nameTakenError();
    }

    return created.toObject();
  }

  public async rename(request: RenameRequest): Promise<Folder> {
    const { folder } = await this.authorize(request.actor, request.folderId, Action.FOLDER_UPDATE);

    // Narrowing here also enforces the rule: only the root folder has no parent
    const parentFolderId = folder.getParentFolderId();

    if (parentFolderId === null) {
      throw this.rootImmutableError();
    }

    const normalizedName = this.toNormalizedName(request.name);

    const taken = await this.folderRepository.findIdByNormalizedName({
      parentFolderId,
      normalizedName,
    });

    // Matching itself is a case-only rename, which stays allowed
    if (taken !== null && taken !== request.folderId) {
      throw this.nameTakenError();
    }

    const renamed = await this.folderRepository.rename({
      folderId: request.folderId,
      name: request.name,
      normalizedName,
    });

    if (renamed === null) {
      const stillThere = await this.folderRepository.findWithOwner(request.folderId);

      throw stillThere === null ? this.notFoundError() : this.nameTakenError();
    }

    return renamed.toObject();
  }

  public async remove(request: ReadRequest): Promise<void> {
    const { folder } = await this.authorize(request.actor, request.folderId, Action.FOLDER_DELETE);

    if (folder.isRoot()) {
      throw this.rootImmutableError();
    }

    await transaction(async (tx) => {
      await lockDataRoom(folder.getDataRoomId(), tx);
      await this.folderRepository.softDeleteSubtree(request.folderId, tx);
    });
  }

  /** The stored key, not the display name: lower-casing can lengthen it past VARCHAR(255). */
  private toNormalizedName(name: string): string {
    const normalizedName = normalizeName(name);

    if ([...normalizedName].length > FolderLimit.NAME_MAX_CHARACTERS) {
      throw new FolderError({
        code: ErrorCode.VALIDATION_ERROR,
        message: FolderErrorMessage.NAME_TOO_LONG,
        status: HTTPCode.UNPROCESSABLE_ENTITY,
      });
    }

    return normalizedName;
  }

  /** Find inside the actor's reachable scope first, then ask whether the action is allowed. */
  private async authorize(
    actor: Actor,
    folderId: string,
    action: Action,
  ): Promise<FolderWithOwner> {
    const found = await this.folderRepository.findWithOwner(folderId);

    if (found === null) {
      throw this.notFoundError();
    }

    this.accessPolicy.require({
      actor,
      action,
      resource: {
        kind: ResourceKind.FOLDER,
        dataRoomId: found.folder.getDataRoomId(),
        ownerId: found.ownerId,
      },
    });

    return found;
  }

  private notFoundError(): FolderError {
    return new FolderError({
      code: ErrorCode.FOLDER_NOT_FOUND,
      message: FolderErrorMessage.NOT_FOUND,
      status: HTTPCode.NOT_FOUND,
    });
  }

  private nameTakenError(): FolderError {
    return new FolderError({
      code: ErrorCode.NAME_CONFLICT,
      message: FolderErrorMessage.NAME_TAKEN,
      status: HTTPCode.CONFLICT,
    });
  }

  private rootImmutableError(): FolderError {
    return new FolderError({
      code: ErrorCode.FORBIDDEN,
      message: FolderErrorMessage.ROOT_IMMUTABLE,
      status: HTTPCode.FORBIDDEN,
    });
  }

  private depthLimitError(): FolderError {
    return new FolderError({
      code: ErrorCode.FOLDER_DEPTH_LIMIT_EXCEEDED,
      message: FolderErrorMessage.DEPTH_LIMIT_EXCEEDED,
      status: HTTPCode.CONFLICT,
    });
  }
}

export { FolderService };
