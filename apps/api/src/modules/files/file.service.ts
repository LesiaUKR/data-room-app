import { randomUUID } from 'node:crypto';

import {
  Action,
  type CompletedVersion,
  type DataRoomFile,
  type FileDetail,
  ErrorCode,
  FileVersionStatus,
  ResourceKind,
  type SignedUrlResponse,
  type UploadIntent,
  UploadMode,
  uploadLimits,
} from '@data-room/contracts';

import { normalizeName, sweepRetiredVersions, toUserPrincipal } from '../../libs/helpers/index.js';
import { type AccessPolicy } from '../../libs/modules/access/index.js';
import {
  lockDataRoom,
  transaction,
  type TransactionClient,
} from '../../libs/modules/database/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { logger } from '../../libs/modules/logger/index.js';
import {
  type SignedUrl,
  type StorageProvider,
  type StoredObject,
} from '../../libs/modules/storage/index.js';
import { type Actor, type Principal } from '../../libs/types/index.js';
import { type FolderRepository } from '../folders/folder.repository.js';
import { type FolderWithOwner } from '../folders/libs/types/index.js';
import { type FileVersionEntity } from './file-version.entity.js';
import { type FileEntity } from './file.entity.js';
import { type FileRepository } from './file.repository.js';
import { FileErrorMessage, FileLimit } from './libs/enums/index.js';
import { FileError, UploadRaceError } from './libs/exceptions/index.js';
import { buildObjectKey } from './libs/helpers/index.js';
import { type FileWithOwner } from './libs/types/index.js';

const NEXT_VERSION_STEP = 1;

const MEDIA_TYPE_SEPARATOR = ';';

// Storage may answer with parameters attached ("application/pdf; charset=binary")
const toMediaType = (contentType: string): string =>
  (contentType.split(MEDIA_TYPE_SEPARATOR)[0] ?? '').trim().toLowerCase();

type FileServiceParameters = {
  accessPolicy: AccessPolicy;
  fileRepository: FileRepository;
  folderRepository: FolderRepository;
  storage: StorageProvider;
};

type FileRequest = {
  actor: Actor;
  fileId: string;
};

// Reads accept a public-link principal too; no write route is public
type FileReadRequest = {
  principal: Principal;
  fileId: string;
};

type UploadIntentRequest = {
  actor: Actor;
  folderId: string;
  name: string;
  contentType: string;
};

type CompleteRequest = {
  actor: Actor;
  versionId: string;
};

type RenameRequest = FileRequest & {
  name: string;
};

type MoveRequest = FileRequest & {
  folderId: string;
};

type ReserveRequest = {
  actor: Actor;
  dataRoomId: string;
  folderId: string;
  name: string;
  normalizedName: string;
};

type NextVersionRequest = {
  actor: Actor;
  dataRoomId: string;
  file: FileEntity;
  tx: TransactionClient;
};

type CompletedVersionParts = {
  file: FileEntity;
  version: FileVersionEntity;
  isCurrent: boolean;
};

type Reservation = {
  mode: UploadMode;
  file: FileEntity;
  version: FileVersionEntity;
};

class FileService {
  private readonly accessPolicy: AccessPolicy;

  private readonly fileRepository: FileRepository;

  private readonly folderRepository: FolderRepository;

  private readonly storage: StorageProvider;

  public constructor({
    accessPolicy,
    fileRepository,
    folderRepository,
    storage,
  }: FileServiceParameters) {
    this.accessPolicy = accessPolicy;
    this.fileRepository = fileRepository;
    this.folderRepository = folderRepository;
    this.storage = storage;
  }

  public async createUploadIntent(request: UploadIntentRequest): Promise<UploadIntent> {
    const target = await this.authorizeFolder(
      toUserPrincipal(request.actor),
      request.folderId,
      Action.FILE_CREATE,
    );

    const reservation = await this.reserveVersion({
      actor: request.actor,
      dataRoomId: target.folder.getDataRoomId(),
      folderId: request.folderId,
      name: request.name,
      normalizedName: this.toNormalizedName(request.name),
    });

    // Signing sits outside the transaction: a call to another vendor must not hold the room lock
    const upload = await this.signUpload(reservation.version, request.contentType);

    return {
      mode: reservation.mode,
      fileId: reservation.file.getId(),
      folderId: request.folderId,
      versionId: reservation.version.getId(),
      versionNumber: reservation.version.getVersionNumber(),
      // The stored name wins: uploading CONTRACT.pdf over Contract.pdf versions it, never renames
      name: reservation.file.getName(),
      upload: { url: upload.url, expiresAt: upload.expiresAt.toISOString() },
    };
  }

  public async completeUpload(request: CompleteRequest): Promise<CompletedVersion> {
    const found = await this.fileRepository.findVersionWithFile(request.versionId);

    if (found === null) {
      throw this.versionNotFoundError();
    }

    // A write into the folder, so a grant on the file alone must not authorize it
    await this.authorizeFolder(
      toUserPrincipal(request.actor),
      found.file.getFolderId(),
      Action.FILE_CREATE,
    );

    if (found.version.isReady()) {
      return this.toCompletedVersion({
        file: found.file,
        version: found.version,
        isCurrent: found.file.isCurrentVersion(request.versionId),
      });
    }

    if (!found.version.isPending()) {
      throw this.invalidVersionStateError();
    }

    const stored = await this.verifyStoredObject(found.version);

    const isCurrent = await transaction(async (tx) => {
      await lockDataRoom(found.file.getDataRoomId(), tx);

      // The HEAD check took a network round trip; a delete may have retired the version meanwhile
      const fresh = await this.fileRepository.findVersionWithFile(request.versionId, tx);

      if (fresh === null || !fresh.version.isPending()) {
        throw this.invalidVersionStateError();
      }

      await this.fileRepository.markVersionReady(
        {
          versionId: request.versionId,
          sizeBytes: stored.sizeBytes,
          contentType: stored.contentType,
        },
        tx,
      );

      return this.fileRepository.promoteCurrentVersion(
        {
          fileId: found.file.getId(),
          versionId: request.versionId,
          versionNumber: found.version.getVersionNumber(),
        },
        tx,
      );
    });

    return {
      fileId: found.file.getId(),
      folderId: found.file.getFolderId(),
      versionId: request.versionId,
      versionNumber: found.version.getVersionNumber(),
      name: found.file.getName(),
      sizeBytes: stored.sizeBytes.toString(),
      contentType: stored.contentType,
      status: FileVersionStatus.READY,
      isCurrent,
    };
  }

  public async getFile(request: FileReadRequest): Promise<FileDetail> {
    const { file } = await this.authorizeFile(request.principal, request.fileId, Action.FILE_READ);

    const version = await this.fileRepository.findCurrentVersion(request.fileId);
    const sizeBytes = version?.getSizeBytes() ?? null;
    const contentType = version?.getContentType() ?? null;

    if (version === null || sizeBytes === null || contentType === null) {
      throw this.noReadyVersionError();
    }

    return {
      ...file.toObject(),
      versionNumber: version.getVersionNumber(),
      sizeBytes,
      contentType,
    };
  }

  public async getDownloadUrl(request: FileReadRequest): Promise<SignedUrlResponse> {
    await this.authorizeFile(request.principal, request.fileId, Action.FILE_READ);

    const version = await this.fileRepository.findCurrentVersion(request.fileId);

    if (version === null) {
      throw this.noReadyVersionError();
    }

    const signed = await this.storage.createDownloadUrl(version.getObjectKey());

    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  public async rename(request: RenameRequest): Promise<DataRoomFile> {
    const { file } = await this.authorizeFile(
      toUserPrincipal(request.actor),
      request.fileId,
      Action.FILE_UPDATE,
    );

    const normalizedName = this.toNormalizedName(request.name);

    const taken = await this.fileRepository.findByNormalizedName({
      folderId: file.getFolderId(),
      normalizedName,
    });

    // Matching itself is a case-only rename, which stays allowed
    if (taken !== null && taken.getId() !== request.fileId) {
      throw this.nameTakenError();
    }

    const renamed = await this.fileRepository.rename({
      fileId: request.fileId,
      name: request.name,
      normalizedName,
    });

    return this.resolveWriteResult(renamed, request.fileId);
  }

  public async move(request: MoveRequest): Promise<DataRoomFile> {
    const source = await this.authorizeFile(
      toUserPrincipal(request.actor),
      request.fileId,
      Action.FILE_UPDATE,
    );

    if (source.file.getFolderId() === request.folderId) {
      return source.file.toObject();
    }

    const target = await this.authorizeFolder(
      toUserPrincipal(request.actor),
      request.folderId,
      Action.FILE_CREATE,
    );

    // One owner may hold several rooms; a target outside this file's room is simply not there
    if (target.folder.getDataRoomId() !== source.file.getDataRoomId()) {
      throw this.folderNotFoundError();
    }

    const normalizedName = source.file.getNormalizedName();

    const moved = await transaction(async (tx) => {
      await lockDataRoom(source.file.getDataRoomId(), tx);

      const stillActive = await this.folderRepository.findWithOwner(request.folderId, tx);

      if (stillActive === null) {
        throw this.folderNotFoundError();
      }

      const taken = await this.fileRepository.findByNormalizedName(
        { folderId: request.folderId, normalizedName },
        tx,
      );

      if (taken !== null) {
        throw this.nameTakenError();
      }

      return this.fileRepository.move({ fileId: request.fileId, folderId: request.folderId }, tx);
    });

    return this.resolveWriteResult(moved, request.fileId);
  }

  public async remove(request: FileRequest): Promise<void> {
    const { file } = await this.authorizeFile(
      toUserPrincipal(request.actor),
      request.fileId,
      Action.FILE_DELETE,
    );

    const retired = await transaction(async (tx) => {
      await lockDataRoom(file.getDataRoomId(), tx);

      return this.fileRepository.retireVersionsAndSoftDelete(request.fileId, tx);
    });

    await sweepRetiredVersions({
      retired,
      storage: this.storage,
      markDeleted: (versionIds) => this.fileRepository.markVersionsDeleted(versionIds),
    });
  }

  /** A P2002 aborts the surrounding transaction, so the retry restarts it instead of looping inside. */
  private async reserveVersion(request: ReserveRequest): Promise<Reservation> {
    for (let attempt = 0; attempt < FileLimit.VERSION_ALLOCATION_ATTEMPTS; attempt += 1) {
      try {
        return await this.reserveOnce(request);
      } catch (error) {
        if (!(error instanceof UploadRaceError)) {
          throw error;
        }
      }
    }

    logger.error(
      { folderId: request.folderId, attempts: FileLimit.VERSION_ALLOCATION_ATTEMPTS },
      'Version allocation exhausted its retries',
    );

    throw this.versionAllocationError();
  }

  private async signUpload(version: FileVersionEntity, contentType: string): Promise<SignedUrl> {
    try {
      return await this.storage.createUploadUrl({
        objectKey: version.getObjectKey(),
        contentType,
        maxSizeBytes: uploadLimits.maxBytes,
      });
    } catch (error) {
      // No URL ever reached the client, so PENDING would misrepresent a dead reservation
      await this.fileRepository.markVersionFailed(version.getId());

      throw error;
    }
  }

  private async reserveOnce(request: ReserveRequest): Promise<Reservation> {
    return transaction(async (tx) => {
      await lockDataRoom(request.dataRoomId, tx);

      // Re-read under the lock: the target folder may have been deleted while we waited for it
      const stillActive = await this.folderRepository.findWithOwner(request.folderId, tx);

      if (stillActive === null) {
        throw this.folderNotFoundError();
      }

      const existing = await this.fileRepository.findByNormalizedName(
        { folderId: request.folderId, normalizedName: request.normalizedName },
        tx,
      );

      const file = existing ?? (await this.createFile(request, tx));
      const mode = existing === null ? UploadMode.NEW_FILE : UploadMode.NEW_VERSION;

      const version = await this.createNextVersion({
        actor: request.actor,
        dataRoomId: request.dataRoomId,
        file,
        tx,
      });

      return { mode, file, version };
    });
  }

  private async createFile(request: ReserveRequest, tx: TransactionClient): Promise<FileEntity> {
    const created = await this.fileRepository.create(
      {
        dataRoomId: request.dataRoomId,
        folderId: request.folderId,
        name: request.name,
        normalizedName: request.normalizedName,
      },
      tx,
    );

    if (created === null) {
      throw new UploadRaceError(FileErrorMessage.NAME_TAKEN);
    }

    return created;
  }

  private async createNextVersion({
    actor,
    dataRoomId,
    file,
    tx,
  }: NextVersionRequest): Promise<FileVersionEntity> {
    const latest = await this.fileRepository.findLatestVersionNumber(file.getId(), tx);
    // The application picks the id because the object key embeds it and is NOT NULL at insert
    const versionId = randomUUID();

    const created = await this.fileRepository.createVersion(
      {
        id: versionId,
        fileId: file.getId(),
        versionNumber: latest + NEXT_VERSION_STEP,
        objectKey: buildObjectKey({ dataRoomId, fileId: file.getId(), versionId }),
        createdById: actor.userId,
      },
      tx,
    );

    if (created === null) {
      throw new UploadRaceError(FileErrorMessage.VERSION_ALLOCATION_FAILED);
    }

    return created;
  }

  private async verifyStoredObject(version: FileVersionEntity): Promise<StoredObject> {
    const stored = await this.headOrNull(version.getObjectKey());

    if (stored === null) {
      await this.fileRepository.markVersionFailed(version.getId());

      throw this.uploadIncompleteError();
    }

    // The signed PUT does not enforce the declared type, so this is the only real check
    if (toMediaType(stored.contentType) !== uploadLimits.contentType) {
      await this.fileRepository.markVersionFailed(version.getId());
      // Best effort: the row keeps the key, so a failed cleanup remains a sweep target
      await this.storage.deleteMany([version.getObjectKey()]).catch(() => undefined);

      throw this.unsupportedContentTypeError();
    }

    return stored;
  }

  private async headOrNull(objectKey: string): Promise<StoredObject | null> {
    try {
      return await this.storage.head(objectKey);
    } catch {
      return null;
    }
  }

  private toCompletedVersion({
    file,
    version,
    isCurrent,
  }: CompletedVersionParts): CompletedVersion {
    const sizeBytes = version.getSizeBytes();
    const contentType = version.getContentType();

    if (sizeBytes === null || contentType === null) {
      throw this.invalidVersionStateError();
    }

    return {
      fileId: file.getId(),
      folderId: file.getFolderId(),
      versionId: version.getId(),
      versionNumber: version.getVersionNumber(),
      name: file.getName(),
      sizeBytes,
      contentType,
      status: FileVersionStatus.READY,
      isCurrent,
    };
  }

  private async resolveWriteResult(
    written: FileEntity | null,
    fileId: string,
  ): Promise<DataRoomFile> {
    if (written !== null) {
      return written.toObject();
    }

    const stillThere = await this.fileRepository.findWithOwner(fileId);

    throw stillThere === null ? this.notFoundError() : this.nameTakenError();
  }

  /** The stored key, not the display name: lower-casing can lengthen it past VARCHAR(255). */
  private toNormalizedName(name: string): string {
    const normalizedName = normalizeName(name);

    if ([...normalizedName].length > FileLimit.NAME_MAX_CHARACTERS) {
      throw new FileError({
        code: ErrorCode.VALIDATION_ERROR,
        message: FileErrorMessage.NAME_TOO_LONG,
        status: HTTPCode.UNPROCESSABLE_ENTITY,
      });
    }

    return normalizedName;
  }

  private async authorizeFile(
    principal: Principal,
    fileId: string,
    action: Action,
  ): Promise<FileWithOwner> {
    const found = await this.fileRepository.findWithOwner(fileId);

    if (found === null) {
      throw this.notFoundError();
    }

    await this.accessPolicy.require({
      principal,
      action,
      resource: {
        kind: ResourceKind.FILE,
        dataRoomId: found.file.getDataRoomId(),
        ownerId: found.ownerId,
        fileId,
        folderId: found.file.getFolderId(),
      },
    });

    return found;
  }

  private async authorizeFolder(
    principal: Principal,
    folderId: string,
    action: Action,
  ): Promise<FolderWithOwner> {
    const found = await this.folderRepository.findWithOwner(folderId);

    if (found === null) {
      throw this.folderNotFoundError();
    }

    await this.accessPolicy.require({
      principal,
      action,
      resource: {
        kind: ResourceKind.FOLDER,
        dataRoomId: found.folder.getDataRoomId(),
        ownerId: found.ownerId,
        folderId,
      },
    });

    return found;
  }

  private notFoundError(): FileError {
    return new FileError({
      code: ErrorCode.FILE_NOT_FOUND,
      message: FileErrorMessage.NOT_FOUND,
      status: HTTPCode.NOT_FOUND,
    });
  }

  private versionNotFoundError(): FileError {
    return new FileError({
      code: ErrorCode.FILE_VERSION_NOT_FOUND,
      message: FileErrorMessage.VERSION_NOT_FOUND,
      status: HTTPCode.NOT_FOUND,
    });
  }

  private folderNotFoundError(): FileError {
    return new FileError({
      code: ErrorCode.FOLDER_NOT_FOUND,
      message: FileErrorMessage.FOLDER_NOT_FOUND,
      status: HTTPCode.NOT_FOUND,
    });
  }

  private nameTakenError(): FileError {
    return new FileError({
      code: ErrorCode.NAME_CONFLICT,
      message: FileErrorMessage.NAME_TAKEN,
      status: HTTPCode.CONFLICT,
    });
  }

  private invalidVersionStateError(): FileError {
    return new FileError({
      code: ErrorCode.INVALID_FILE_VERSION_STATE,
      message: FileErrorMessage.VERSION_NOT_PENDING,
      status: HTTPCode.CONFLICT,
    });
  }

  private uploadIncompleteError(): FileError {
    return new FileError({
      code: ErrorCode.UPLOAD_INCOMPLETE,
      message: FileErrorMessage.UPLOAD_INCOMPLETE,
      status: HTTPCode.CONFLICT,
    });
  }

  private noReadyVersionError(): FileError {
    return new FileError({
      code: ErrorCode.UPLOAD_INCOMPLETE,
      message: FileErrorMessage.NO_READY_VERSION,
      status: HTTPCode.CONFLICT,
    });
  }

  private unsupportedContentTypeError(): FileError {
    return new FileError({
      code: ErrorCode.UNSUPPORTED_FILE_TYPE,
      message: FileErrorMessage.UNSUPPORTED_CONTENT_TYPE,
      status: HTTPCode.CONFLICT,
    });
  }

  private versionAllocationError(): FileError {
    return new FileError({
      code: ErrorCode.INTERNAL_ERROR,
      message: FileErrorMessage.VERSION_ALLOCATION_FAILED,
      status: HTTPCode.INTERNAL_SERVER_ERROR,
    });
  }
}

export { FileService };
