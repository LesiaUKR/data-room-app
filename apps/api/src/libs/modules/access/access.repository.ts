import { type DatabaseClient } from '../database/index.js';
import { grantEvidenceRowsSchema } from './access.model.js';
import { type GrantEvidence, type GrantLookup } from './libs/types/index.js';

// The folder chain is depth-bounded, so this is a safety net rather than pagination
const MAX_MATCHING_GRANTS = 64;

class AccessRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  /** Walks up from the resource folder, then matches every grant that can reach it. */
  public async findActiveGrants(lookup: GrantLookup): Promise<GrantEvidence[]> {
    const rows = await (lookup.tx ?? this.database).$queryRaw`
      WITH RECURSIVE chain AS (
        SELECT id, parent_folder_id
        FROM folder
        WHERE id = ${lookup.folderId}::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT f.id, f.parent_folder_id
        FROM folder f
        JOIN chain c ON f.id = c.parent_folder_id
        WHERE f.deleted_at IS NULL
      )
      SELECT
        g.id AS "grantId",
        g.role::text AS "role",
        g.type::text AS "type",
        g.data_room_id AS "dataRoomId",
        g.folder_id AS "targetFolderId",
        g.file_id AS "targetFileId",
        CASE
          WHEN g.folder_id IS NULL AND g.file_id IS NULL THEN 'DATA_ROOM'
          WHEN g.file_id IS NOT NULL THEN 'DIRECT_FILE'
          WHEN g.folder_id = ${lookup.folderId}::uuid THEN 'DIRECT_FOLDER'
          ELSE 'ANCESTOR_FOLDER'
        END AS "source"
      FROM share_grant g
      WHERE g.data_room_id = ${lookup.dataRoomId}::uuid
        AND g.revoked_at IS NULL
        AND (g.expires_at IS NULL OR g.expires_at > now())
        AND (
          (g.type = 'USER'::"share_type" AND g.recipient_user_id = ${lookup.userId}::uuid)
          OR (g.type = 'PUBLIC_LINK'::"share_type" AND g.token_hash = ${lookup.tokenHash})
        )
        AND (
          (g.folder_id IS NULL AND g.file_id IS NULL)
          OR g.folder_id IN (SELECT id FROM chain)
          OR g.file_id = ${lookup.fileId}::uuid
        )
      ORDER BY CASE g.role::text WHEN 'EDITOR' THEN 0 ELSE 1 END, g.id
      LIMIT ${MAX_MATCHING_GRANTS}
    `;

    return grantEvidenceRowsSchema.parse(rows);
  }
}

export { AccessRepository };
