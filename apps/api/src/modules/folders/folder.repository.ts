import { isUniqueViolation } from '../../libs/helpers/index.js';
import { type DatabaseClient, type TransactionClient } from '../../libs/modules/database/index.js';
import { type RetiredVersion } from '../../libs/types/index.js';
import { type FolderEntity } from './folder.entity.js';
import {
  folderAncestorRowsSchema,
  folderContentsRowsSchema,
  folderSelect,
  folderSubtreeStatsRowsSchema,
  folderWithOwnerSelect,
  retiredVersionRowsSchema,
  toFolderContentsEntry,
  toFolderEntity,
  toFolderWithOwner,
} from './folder.model.js';
import {
  encodeFolderCursor,
  FILE_KIND_RANK,
  FOLDER_KIND_RANK,
  LIST_START,
} from './libs/helpers/index.js';
import {
  type CreateFolderRecord,
  type FolderAncestor,
  type FolderContentsPage,
  type FolderNameLookup,
  type FolderSubtreeStats,
  type FolderWithOwner,
  type ListContentsInput,
  type RenameFolderRecord,
} from './libs/types/index.js';

class FolderRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  public async findWithOwner(
    folderId: string,
    tx?: TransactionClient,
  ): Promise<FolderWithOwner | null> {
    const row = await (tx ?? this.database).folder.findFirst({
      // A soft-deleted data room must hide every folder inside it
      where: { id: folderId, deletedAt: null, dataRoom: { deletedAt: null } },
      select: folderWithOwnerSelect,
    });

    return row ? toFolderWithOwner(row) : null;
  }

  /** Walks up: the recursive step joins child.parent_folder_id, the subtree query joins the reverse. */
  public async findAncestors(folderId: string): Promise<FolderAncestor[]> {
    const rows = await this.database.$queryRaw`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_folder_id, name, depth
        FROM folder
        WHERE id = ${folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id, f.parent_folder_id, f.name, f.depth
        FROM folder f
        JOIN ancestors a ON f.id = a.parent_folder_id
        WHERE f.deleted_at IS NULL
      )
      SELECT id, name, depth
      FROM ancestors
      WHERE depth > 0
      ORDER BY depth ASC
    `;

    return folderAncestorRowsSchema.parse(rows);
  }

  public async listContents(input: ListContentsInput): Promise<FolderContentsPage> {
    const { position } = input;
    const folderFrom = position.kindRank === FOLDER_KIND_RANK ? position : LIST_START;
    const fileFrom = position.kindRank === FILE_KIND_RANK ? position : LIST_START;
    const take = input.limit + 1;

    // The keyset predicate stays inside each branch so it can act as an index boundary;
    // a leading constant in the row comparison would degrade it to a plain filter.
    const rows = await this.database.$queryRaw`
      (
        SELECT
          0 AS "kindRank",
          f.id,
          f.name,
          f.normalized_name AS "normalizedName",
          f.updated_at AS "updatedAt",
          NULL::text AS "sizeBytes",
          NULL::text AS "contentType",
          NULL::int AS "versionNumber"
        FROM folder f
        WHERE f.data_room_id = ${input.dataRoomId}::uuid
          AND f.parent_folder_id = ${input.folderId}::uuid
          AND f.deleted_at IS NULL
          AND ${position.kindRank} <= ${FOLDER_KIND_RANK}
          AND (f.normalized_name, f.id) > (${folderFrom.normalizedName}, ${folderFrom.id}::uuid)
        ORDER BY f.normalized_name, f.id
        LIMIT ${take}
      )
      UNION ALL
      (
        SELECT
          1 AS "kindRank",
          fi.id,
          fi.name,
          fi.normalized_name AS "normalizedName",
          fi.updated_at AS "updatedAt",
          fv.size_bytes::text AS "sizeBytes",
          fv.content_type AS "contentType",
          fv.version_number AS "versionNumber"
        FROM file fi
        JOIN file_version fv ON fv.id = fi.current_version_id AND fv.status = 'READY'
        WHERE fi.data_room_id = ${input.dataRoomId}::uuid
          AND fi.folder_id = ${input.folderId}::uuid
          AND fi.deleted_at IS NULL
          AND (fi.normalized_name, fi.id) > (${fileFrom.normalizedName}, ${fileFrom.id}::uuid)
        ORDER BY fi.normalized_name, fi.id
        LIMIT ${take}
      )
      ORDER BY "kindRank", "normalizedName", id
      LIMIT ${take}
    `;

    const parsed = folderContentsRowsSchema.parse(rows);
    const hasMore = parsed.length > input.limit;
    const page = hasMore ? parsed.slice(0, input.limit) : parsed;
    const last = page.at(-1);

    return {
      entries: page.map(toFolderContentsEntry),
      nextCursor:
        hasMore && last
          ? encodeFolderCursor({
              folderId: input.folderId,
              kindRank: last.kindRank,
              normalizedName: last.normalizedName,
              id: last.id,
            })
          : null,
    };
  }

  public async findSubtreeStats(folderId: string): Promise<FolderSubtreeStats> {
    const rows = await this.database.$queryRaw`
      WITH RECURSIVE subtree AS (
        SELECT id, 0 AS level
        FROM folder
        WHERE id = ${folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id, s.level + 1
        FROM folder f
        JOIN subtree s ON f.parent_folder_id = s.id
        WHERE f.deleted_at IS NULL
      )
      SELECT
        (SELECT COUNT(*) FROM subtree WHERE level > 0)::text AS "folderCount",
        COUNT(fv.id)::text AS "fileCount",
        COALESCE(SUM(fv.size_bytes), 0)::text AS "totalBytes"
      FROM subtree st
      LEFT JOIN file fi ON fi.folder_id = st.id AND fi.deleted_at IS NULL
      LEFT JOIN file_version fv ON fv.id = fi.current_version_id AND fv.status = 'READY'
    `;

    const [stats] = folderSubtreeStatsRowsSchema.parse(rows);

    return stats;
  }

  public async findIdByNormalizedName(
    input: FolderNameLookup,
    tx?: TransactionClient,
  ): Promise<string | null> {
    const row = await (tx ?? this.database).folder.findFirst({
      where: {
        parentFolderId: input.parentFolderId,
        normalizedName: input.normalizedName,
        deletedAt: null,
      },
      select: { id: true },
    });

    return row?.id ?? null;
  }

  /** `null` means the name was taken concurrently — the partial unique index is the real guard. */
  public async create(
    input: CreateFolderRecord,
    tx?: TransactionClient,
  ): Promise<FolderEntity | null> {
    try {
      const row = await (tx ?? this.database).folder.create({
        data: {
          dataRoomId: input.dataRoomId,
          parentFolderId: input.parentFolderId,
          name: input.name,
          normalizedName: input.normalizedName,
          depth: input.depth,
        },
        select: folderSelect,
      });

      return toFolderEntity(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  /** `null` covers both a taken name and a folder deleted meanwhile; the service tells them apart. */
  public async rename(input: RenameFolderRecord): Promise<FolderEntity | null> {
    try {
      const result = await this.database.folder.updateMany({
        where: { id: input.folderId, deletedAt: null },
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

    const row = await this.database.folder.findFirst({
      where: { id: input.folderId, deletedAt: null },
      select: folderSelect,
    });

    return row ? toFolderEntity(row) : null;
  }

  /** Retires the bytes under the folder too, or deleted documents stay readable in the store. */
  public async softDeleteSubtree(
    folderId: string,
    tx: TransactionClient,
  ): Promise<RetiredVersion[]> {
    // Versions first, while their files and folders are all still active and the CTE can see them
    const rows = await tx.$queryRaw`
      WITH RECURSIVE subtree AS (
        SELECT id FROM folder WHERE id = ${folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id FROM folder f
        JOIN subtree s ON f.parent_folder_id = s.id
        WHERE f.deleted_at IS NULL
      )
      UPDATE file_version fv
      SET status = 'DELETING', updated_at = now()
      FROM file fi
      WHERE fv.file_id = fi.id
        AND fi.folder_id IN (SELECT id FROM subtree)
        AND fi.deleted_at IS NULL
        AND fv.status IN ('PENDING', 'READY', 'FAILED')
      RETURNING fv.id, fv.object_key AS "objectKey"
    `;

    // Files next: once the folders carry deleted_at, the CTE below would match nothing
    await tx.$executeRaw`
      WITH RECURSIVE subtree AS (
        SELECT id FROM folder WHERE id = ${folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id FROM folder f
        JOIN subtree s ON f.parent_folder_id = s.id
        WHERE f.deleted_at IS NULL
      )
      UPDATE file
      SET deleted_at = now(), current_version_id = NULL, updated_at = now()
      WHERE folder_id IN (SELECT id FROM subtree) AND deleted_at IS NULL
    `;

    await tx.$executeRaw`
      WITH RECURSIVE subtree AS (
        SELECT id FROM folder WHERE id = ${folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id FROM folder f
        JOIN subtree s ON f.parent_folder_id = s.id
        WHERE f.deleted_at IS NULL
      )
      UPDATE folder
      SET deleted_at = now(), updated_at = now()
      WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NULL
    `;

    return retiredVersionRowsSchema.parse(rows);
  }

  /** Tail of the subtree delete: called only for keys storage actually removed. */
  public async markVersionsDeleted(versionIds: string[]): Promise<void> {
    await this.database.fileVersion.updateMany({
      where: { id: { in: versionIds }, status: 'DELETING' },
      data: { status: 'DELETED' },
    });
  }
}

export { FolderRepository };
