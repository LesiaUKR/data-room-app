import { FileVersionStatus } from '@data-room/contracts';

import { isUniqueViolation } from '../../libs/helpers/index.js';
import { type DatabaseClient, type TransactionClient } from '../../libs/modules/database/index.js';
import { type RetiredVersion } from '../../libs/types/index.js';
import { type FileVersionEntity } from './file-version.entity.js';
import { type FileEntity } from './file.entity.js';
import {
  fileSelect,
  fileVersionSelect,
  fileVersionWithFileSelect,
  fileWithOwnerSelect,
  retiredVersionRowsSchema,
  toFileEntity,
  toFileVersionEntity,
  toFileVersionWithFile,
  toFileWithOwner,
} from './file.model.js';
import {
  type CompleteVersionRecord,
  type CreateFileRecord,
  type CreateFileVersionRecord,
  type FileNameLookup,
  type FileVersionWithFile,
  type FileWithOwner,
  type MoveFileRecord,
  type PromoteVersionRecord,
  type RenameFileRecord,
} from './libs/types/index.js';

const NO_VERSIONS_YET = 0;

class FileRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  public async findWithOwner(
    fileId: string,
    tx?: TransactionClient,
  ): Promise<FileWithOwner | null> {
    const row = await (tx ?? this.database).file.findFirst({
      where: { id: fileId, deletedAt: null, dataRoom: { deletedAt: null } },
      select: fileWithOwnerSelect,
    });

    return row ? toFileWithOwner(row) : null;
  }

  public async findVersionWithFile(
    versionId: string,
    tx?: TransactionClient,
  ): Promise<FileVersionWithFile | null> {
    const row = await (tx ?? this.database).fileVersion.findFirst({
      where: {
        id: versionId,
        file: { deletedAt: null, dataRoom: { deletedAt: null } },
      },
      select: fileVersionWithFileSelect,
    });

    return row ? toFileVersionWithFile(row) : null;
  }

  public async findCurrentVersion(fileId: string): Promise<FileVersionEntity | null> {
    const row = await this.database.fileVersion.findFirst({
      where: {
        currentOf: { id: fileId, deletedAt: null },
        status: FileVersionStatus.READY,
      },
      select: fileVersionSelect,
    });

    return row ? toFileVersionEntity(row) : null;
  }

  public async findByNormalizedName(
    input: FileNameLookup,
    tx?: TransactionClient,
  ): Promise<FileEntity | null> {
    const row = await (tx ?? this.database).file.findFirst({
      where: {
        folderId: input.folderId,
        normalizedName: input.normalizedName,
        deletedAt: null,
      },
      select: fileSelect,
    });

    return row ? toFileEntity(row) : null;
  }

  /** Counts every version, including failed and deleted ones: numbers are never reused. */
  public async findLatestVersionNumber(fileId: string, tx: TransactionClient): Promise<number> {
    const result = await tx.fileVersion.aggregate({
      where: { fileId },
      _max: { versionNumber: true },
    });

    return result._max.versionNumber ?? NO_VERSIONS_YET;
  }

  public async create(input: CreateFileRecord, tx: TransactionClient): Promise<FileEntity | null> {
    try {
      const row = await tx.file.create({
        data: {
          dataRoomId: input.dataRoomId,
          folderId: input.folderId,
          name: input.name,
          normalizedName: input.normalizedName,
        },
        select: fileSelect,
      });

      return toFileEntity(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  public async createVersion(
    input: CreateFileVersionRecord,
    tx: TransactionClient,
  ): Promise<FileVersionEntity | null> {
    try {
      const row = await tx.fileVersion.create({
        data: {
          id: input.id,
          fileId: input.fileId,
          versionNumber: input.versionNumber,
          objectKey: input.objectKey,
          createdById: input.createdById,
        },
        select: fileVersionSelect,
      });

      return toFileVersionEntity(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  public async markVersionReady(
    input: CompleteVersionRecord,
    tx: TransactionClient,
  ): Promise<void> {
    await tx.fileVersion.updateMany({
      where: { id: input.versionId, status: FileVersionStatus.PENDING },
      data: {
        status: FileVersionStatus.READY,
        sizeBytes: BigInt(input.sizeBytes),
        contentType: input.contentType,
      },
    });
  }

  /** Guarded by status so a delete already in flight is not dragged back to FAILED. */
  public async markVersionFailed(versionId: string): Promise<void> {
    await this.database.fileVersion.updateMany({
      where: { id: versionId, status: FileVersionStatus.PENDING },
      data: { status: FileVersionStatus.FAILED },
    });
  }

  /** The comparison sits inside the UPDATE; the read-back tells "already current" from "overtaken". */
  public async promoteCurrentVersion(
    input: PromoteVersionRecord,
    tx: TransactionClient,
  ): Promise<boolean> {
    await tx.$executeRaw`
      UPDATE file
      SET current_version_id = ${input.versionId}::uuid, updated_at = now()
      WHERE id = ${input.fileId}::uuid
        AND deleted_at IS NULL
        AND (
          current_version_id IS NULL
          OR (
            SELECT version_number FROM file_version WHERE id = file.current_version_id
          ) < ${input.versionNumber}
        )
    `;

    const row = await tx.file.findUnique({
      where: { id: input.fileId },
      select: { currentVersionId: true },
    });

    return row?.currentVersionId === input.versionId;
  }

  public async rename(input: RenameFileRecord): Promise<FileEntity | null> {
    try {
      const result = await this.database.file.updateMany({
        where: { id: input.fileId, deletedAt: null },
        data: { name: input.name, normalizedName: input.normalizedName },
      });

      if (result.count === 0) {
        return null;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }

    const row = await this.database.file.findFirst({
      where: { id: input.fileId, deletedAt: null },
      select: fileSelect,
    });

    return row ? toFileEntity(row) : null;
  }

  public async move(input: MoveFileRecord, tx: TransactionClient): Promise<FileEntity | null> {
    try {
      const result = await tx.file.updateMany({
        where: { id: input.fileId, deletedAt: null },
        data: { folderId: input.folderId },
      });

      if (result.count === 0) {
        return null;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }

    const row = await tx.file.findFirst({
      where: { id: input.fileId, deletedAt: null },
      select: fileSelect,
    });

    return row ? toFileEntity(row) : null;
  }

  /** Returns the object keys because storage takes no part in this transaction. */
  public async retireVersionsAndSoftDelete(
    fileId: string,
    tx: TransactionClient,
  ): Promise<RetiredVersion[]> {
    const rows = await tx.$queryRaw`
      UPDATE file_version
      SET status = 'DELETING', updated_at = now()
      WHERE file_id = ${fileId}::uuid
        AND status IN ('PENDING', 'READY', 'FAILED')
      RETURNING id, object_key AS "objectKey"
    `;

    // The pointer would otherwise reference a version already on its way out
    await tx.file.updateMany({
      where: { id: fileId, deletedAt: null },
      data: { deletedAt: new Date(), currentVersionId: null },
    });

    return retiredVersionRowsSchema.parse(rows);
  }

  public async markVersionsDeleted(versionIds: string[]): Promise<void> {
    await this.database.fileVersion.updateMany({
      where: { id: { in: versionIds }, status: FileVersionStatus.DELETING },
      data: { status: FileVersionStatus.DELETED },
    });
  }
}

export { FileRepository };
