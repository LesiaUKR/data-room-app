import {
  Action,
  type CreateShare,
  ErrorCode,
  type ListSharesQuery,
  type PublicShare,
  ResourceKind,
  type SharesResponse,
  type ShareTarget,
  ShareType,
} from '@data-room/contracts';

import { isUniqueViolation, toUserPrincipal } from '../../libs/helpers/index.js';
import { PrincipalKind } from '../../libs/enums/index.js';
import {
  AccessError,
  type AccessPolicy,
  type AccessRequest,
  resourceNotFound,
} from '../../libs/modules/access/index.js';
import {
  lockDataRoom,
  transaction,
  type TransactionClient,
} from '../../libs/modules/database/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { logger } from '../../libs/modules/logger/index.js';
import { type Actor } from '../../libs/types/index.js';
import { type AuthService } from '../auth/auth.service.js';
import { type FileRepository } from '../files/file.repository.js';
import { type FolderRepository } from '../folders/folder.repository.js';
import { ShareErrorMessage, ShareLimit } from './libs/enums/index.js';
import { ShareError, ShareRaceError } from './libs/exceptions/index.js';
import {
  createShareToken,
  decodeShareCursor,
  encodeShareCursor,
  hashShareToken,
  type ShareCursorScope,
} from './libs/helpers/index.js';
import {
  type CreateOutcome,
  type GrantSlot,
  type ResolvedTarget,
  type ShareGrantTarget,
} from './libs/types/index.js';
import { type ShareRepository } from './share.repository.js';

const readAction = {
  [ResourceKind.DATA_ROOM]: Action.DATA_ROOM_READ,
  [ResourceKind.FOLDER]: Action.FOLDER_READ,
  [ResourceKind.FILE]: Action.FILE_READ,
} satisfies Record<ResourceKind, Action>;

type ShareServiceParameters = {
  accessPolicy: AccessPolicy;
  authService: AuthService;
  fileRepository: FileRepository;
  folderRepository: FolderRepository;
  shareRepository: ShareRepository;
};

type CreateRequest = {
  actor: Actor;
  input: CreateShare;
};

type ListRequest = {
  actor: Actor;
  query: ListSharesQuery;
};

type RevokeRequest = {
  actor: Actor;
  shareId: string;
};

type AttemptRequest = {
  actor: Actor;
  input: CreateShare;
  slot: GrantSlot | null;
  dataRoomId: string;
};

type UserGrantRequest = {
  actor: Actor;
  slot: GrantSlot;
  target: ResolvedTarget;
  tx: TransactionClient;
};

type PublicLinkRequest = {
  actor: Actor;
  target: ResolvedTarget;
  tx: TransactionClient;
};

class ShareService {
  private readonly accessPolicy: AccessPolicy;

  private readonly authService: AuthService;

  private readonly fileRepository: FileRepository;

  private readonly folderRepository: FolderRepository;

  private readonly shareRepository: ShareRepository;

  public constructor({
    accessPolicy,
    authService,
    fileRepository,
    folderRepository,
    shareRepository,
  }: ShareServiceParameters) {
    this.accessPolicy = accessPolicy;
    this.authService = authService;
    this.fileRepository = fileRepository;
    this.folderRepository = folderRepository;
    this.shareRepository = shareRepository;
  }

  /** A P2002 aborts the surrounding transaction, so the retry restarts it instead of reading on. */
  public async create(request: CreateRequest): Promise<CreateOutcome> {
    // Pre-reads only: the lock needs a room id, and the recipient never changes between attempts
    const initial = await this.resolveTarget(request.input.target);

    if (initial === null) {
      throw this.targetNotFoundError(request.input.target.kind);
    }

    // Authorize before the recipient is resolved. Otherwise the 422s below would answer two
    // questions a stranger may not ask: whether the target exists, and whether an email is
    // registered. The authoritative check still runs under the lock, against deletion races.
    await this.accessPolicy.require({
      principal: toUserPrincipal(request.actor),
      action: Action.SHARE_CREATE,
      resource: initial.resource,
    });

    const slot =
      request.input.type === ShareType.USER
        ? await this.resolveSlot(request.actor, request.input.recipientEmail, initial)
        : null;

    for (let attempt = 0; attempt < ShareLimit.CREATE_ATTEMPTS; attempt += 1) {
      try {
        return await this.createOnce({
          actor: request.actor,
          input: request.input,
          slot,
          dataRoomId: initial.dataRoomId,
        });
      } catch (error) {
        if (!(error instanceof ShareRaceError)) {
          throw error;
        }
      }
    }

    logger.error(
      { targetKind: request.input.target.kind, attempts: ShareLimit.CREATE_ATTEMPTS },
      'Share creation exhausted its retries',
    );

    throw new ShareError({
      code: ErrorCode.INTERNAL_ERROR,
      message: ShareErrorMessage.CREATE_EXHAUSTED,
      status: HTTPCode.INTERNAL_SERVER_ERROR,
    });
  }

  private async createOnce(request: AttemptRequest): Promise<CreateOutcome> {
    try {
      return await transaction(async (tx) => {
        await lockDataRoom(request.dataRoomId, tx);

        // Authoritative under the lock: the target may have been deleted while it was awaited
        const target = await this.resolveTarget(request.input.target, tx);

        if (target === null) {
          throw this.targetNotFoundError(request.input.target.kind);
        }

        await this.accessPolicy.require({
          principal: toUserPrincipal(request.actor),
          action: Action.SHARE_CREATE,
          resource: target.resource,
          tx,
        });

        return request.slot === null
          ? this.createPublicLink({ actor: request.actor, target, tx })
          : this.createUserGrant({ actor: request.actor, slot: request.slot, target, tx });
      });
    } catch (error) {
      // A user grant retries into the existing row; a link collision retries with a fresh token
      if (isUniqueViolation(error)) {
        throw new ShareRaceError(ShareErrorMessage.RACE);
      }

      throw error;
    }
  }

  private async createUserGrant(request: UserGrantRequest): Promise<CreateOutcome> {
    const existing = await this.shareRepository.findUnrevokedUserGrant(request.slot, request.tx);
    const now = new Date();

    if (existing !== null && !existing.isExpired(now)) {
      return {
        created: false,
        body: { share: existing.toObject(request.target.view), token: null },
      };
    }

    // An expired row still occupies the unique slot, so it is retired before its replacement
    if (existing !== null) {
      await this.shareRepository.revoke(existing.getId(), request.tx);
    }

    const share = await this.shareRepository.create(
      {
        dataRoomId: request.slot.dataRoomId,
        folderId: request.slot.folderId,
        fileId: request.slot.fileId,
        type: ShareType.USER,
        tokenHash: null,
        recipientUserId: request.slot.recipientUserId,
        createdById: request.actor.userId,
      },
      request.tx,
    );

    return { created: true, body: { share: share.toObject(request.target.view), token: null } };
  }

  private async createPublicLink(request: PublicLinkRequest): Promise<CreateOutcome> {
    const token = createShareToken();

    const share = await this.shareRepository.create(
      {
        dataRoomId: request.target.dataRoomId,
        folderId: request.target.folderId,
        fileId: request.target.fileId,
        type: ShareType.PUBLIC_LINK,
        tokenHash: hashShareToken(token),
        recipientUserId: null,
        createdById: request.actor.userId,
      },
      request.tx,
    );

    // The plaintext leaves the server exactly here and never again
    return { created: true, body: { share: share.toObject(request.target.view), token } };
  }

  public async list(request: ListRequest): Promise<SharesResponse> {
    const scope: ShareCursorScope = {
      targetKind: request.query.targetKind,
      targetId: request.query.targetId,
    };

    const target = await this.authorizeTarget(
      request.actor,
      { kind: scope.targetKind, id: scope.targetId },
      Action.SHARE_LIST,
    );

    const page = await this.shareRepository.listActive({
      dataRoomId: target.dataRoomId,
      folderId: target.folderId,
      fileId: target.fileId,
      cursorId:
        request.query.cursor === undefined ? null : decodeShareCursor(request.query.cursor, scope),
      limit: request.query.limit,
    });

    return {
      items: page.items.map((share) => share.toObject(target.view)),
      nextCursor: page.lastId === null ? null : encodeShareCursor(scope, page.lastId),
    };
  }

  public async revoke(request: RevokeRequest): Promise<void> {
    const grant = await this.shareRepository.findById(request.shareId);

    if (grant === null) {
      throw this.notFoundError();
    }

    const target = await this.resolveGrantTarget(grant);

    if (target === null) {
      throw this.notFoundError();
    }

    await this.requireOnShare({
      principal: toUserPrincipal(request.actor),
      action: Action.SHARE_REVOKE,
      resource: target.resource,
    });

    await this.shareRepository.revoke(request.shareId);
  }

  public async resolvePublic(token: string): Promise<PublicShare> {
    const tokenHash = hashShareToken(token);
    const grant = await this.shareRepository.findActiveByTokenHash(tokenHash);

    if (grant === null) {
      throw this.notFoundError();
    }

    const target = await this.resolveGrantTarget(grant);

    if (target === null) {
      throw this.notFoundError();
    }

    // The token found the row, but the policy is still what decides access
    await this.requireOnShare({
      principal: { kind: PrincipalKind.PUBLIC_LINK, tokenHash },
      action: readAction[target.resource.kind],
      resource: target.resource,
    });

    return { target: target.view, role: grant.share.getRole() };
  }

  /**
   * The caller named a share, so an unreachable target must answer about the share. Letting the
   * policy's own FOLDER_NOT_FOUND through would tell a stranger that the id exists and what kind
   * of resource it points at. A 403 is passed on untouched: there the role did resolve.
   */
  private async requireOnShare(request: AccessRequest): Promise<void> {
    try {
      await this.accessPolicy.require(request);
    } catch (error) {
      if (error instanceof AccessError && error.status === HTTPCode.NOT_FOUND) {
        throw this.notFoundError();
      }

      throw error;
    }
  }

  private async authorizeTarget(
    actor: Actor,
    target: ShareTarget,
    action: Action,
  ): Promise<ResolvedTarget> {
    const resolved = await this.resolveTarget(target);

    if (resolved === null) {
      throw this.targetNotFoundError(target.kind);
    }

    await this.accessPolicy.require({
      principal: toUserPrincipal(actor),
      action,
      resource: resolved.resource,
    });

    return resolved;
  }

  private async resolveSlot(
    actor: Actor,
    recipientEmail: string,
    target: ResolvedTarget,
  ): Promise<GrantSlot> {
    const recipientUserId = await this.authService.findUserIdByEmail(recipientEmail);

    if (recipientUserId === null) {
      throw new ShareError({
        code: ErrorCode.RECIPIENT_NOT_FOUND,
        message: ShareErrorMessage.RECIPIENT_NOT_FOUND,
        status: HTTPCode.UNPROCESSABLE_ENTITY,
      });
    }

    if (recipientUserId === actor.userId) {
      throw new ShareError({
        code: ErrorCode.SELF_SHARE_NOT_ALLOWED,
        message: ShareErrorMessage.SELF_SHARE_NOT_ALLOWED,
        status: HTTPCode.UNPROCESSABLE_ENTITY,
      });
    }

    return {
      dataRoomId: target.dataRoomId,
      folderId: target.folderId,
      fileId: target.fileId,
      recipientUserId,
    };
  }

  private resolveGrantTarget(grant: ShareGrantTarget): Promise<ResolvedTarget | null> {
    if (grant.fileId !== null) {
      return this.resolveTarget({ kind: ResourceKind.FILE, id: grant.fileId });
    }

    if (grant.folderId !== null) {
      return this.resolveTarget({ kind: ResourceKind.FOLDER, id: grant.folderId });
    }

    return this.resolveTarget({ kind: ResourceKind.DATA_ROOM, id: grant.dataRoomId });
  }

  private async resolveTarget(
    target: ShareTarget,
    tx?: TransactionClient,
  ): Promise<ResolvedTarget | null> {
    if (target.kind === ResourceKind.DATA_ROOM) {
      const room = await this.shareRepository.findDataRoomTarget(target.id, tx);

      return room === null
        ? null
        : {
            dataRoomId: room.dataRoomId,
            folderId: null,
            fileId: null,
            resource: {
              kind: ResourceKind.DATA_ROOM,
              dataRoomId: room.dataRoomId,
              ownerId: room.ownerId,
            },
            view: {
              kind: ResourceKind.DATA_ROOM,
              id: room.dataRoomId,
              name: room.name,
              rootFolderId: room.rootFolderId,
            },
          };
    }

    if (target.kind === ResourceKind.FOLDER) {
      const found = await this.folderRepository.findWithOwner(target.id, tx);

      return found === null
        ? null
        : {
            dataRoomId: found.folder.getDataRoomId(),
            folderId: target.id,
            fileId: null,
            resource: {
              kind: ResourceKind.FOLDER,
              dataRoomId: found.folder.getDataRoomId(),
              ownerId: found.ownerId,
              folderId: target.id,
            },
            view: { kind: ResourceKind.FOLDER, id: target.id, name: found.folder.getName() },
          };
    }

    const found = await this.fileRepository.findWithOwner(target.id, tx);

    return found === null
      ? null
      : {
          dataRoomId: found.file.getDataRoomId(),
          folderId: null,
          fileId: target.id,
          resource: {
            kind: ResourceKind.FILE,
            dataRoomId: found.file.getDataRoomId(),
            ownerId: found.ownerId,
            fileId: target.id,
            folderId: found.file.getFolderId(),
          },
          view: { kind: ResourceKind.FILE, id: target.id, name: found.file.getName() },
        };
  }

  private targetNotFoundError(kind: ResourceKind): ShareError {
    const { code, message } = resourceNotFound[kind];

    return new ShareError({ code, message, status: HTTPCode.NOT_FOUND });
  }

  private notFoundError(): ShareError {
    return new ShareError({
      code: ErrorCode.SHARE_NOT_FOUND,
      message: ShareErrorMessage.NOT_FOUND,
      status: HTTPCode.NOT_FOUND,
    });
  }
}

export { ShareService };
