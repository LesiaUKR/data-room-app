-- ---------------------------------------------------------------------------
-- Hand-written PostgreSQL SQL, like the partial indexes in the init migration.
-- Prisma cannot express a partial index without the `partialIndexes` Preview flag
-- this project deliberately avoids, so these live only here and are reviewed
-- before they run. No column is added and no row is touched.
--
-- Invariant: at most one ACTIVE user grant per (recipient, target). Without it a
-- second grant can be created for the same pair, and revoking the first one leaves
-- access alive through the second - a revoke that silently does not revoke.
--
-- Three indexes rather than one, because the target lives in different columns and
-- Postgres treats NULLs as distinct: a single index over (folder_id, file_id,
-- recipient_user_id) would never collide for room-level grants, where both target
-- columns are NULL. This is the same trap folder_single_root_key exists for.
--
-- `revoked_at IS NULL` keeps revoked rows out of the rule, so the owner can share
-- again with someone whose access was revoked earlier. `expires_at` is absent on
-- purpose: an index predicate must be immutable and NOW() is not, which is why the
-- create flow explicitly revokes an expired row before inserting its replacement.
--
-- PUBLIC_LINK grants are excluded by design: several independent links may point at
-- one resource, each revocable on its own, and share_grant_token_hash_key already
-- keeps the tokens themselves unique.
-- ---------------------------------------------------------------------------

-- Prisma Migrate does not wrap a migration file in a transaction, so without this the
-- table could be left half-guarded if a later statement failed.
BEGIN;

-- Room-level grant: both target columns are NULL.
CREATE UNIQUE INDEX "share_grant_active_user_room_key"
    ON "share_grant" ("data_room_id", "recipient_user_id")
    WHERE "type" = 'USER'::"share_type"
      AND "revoked_at" IS NULL
      AND "folder_id" IS NULL
      AND "file_id" IS NULL;

-- Grant on one folder and everything under it.
CREATE UNIQUE INDEX "share_grant_active_user_folder_key"
    ON "share_grant" ("folder_id", "recipient_user_id")
    WHERE "type" = 'USER'::"share_type"
      AND "revoked_at" IS NULL
      AND "folder_id" IS NOT NULL;

-- Grant on one logical file, covering its READY versions.
CREATE UNIQUE INDEX "share_grant_active_user_file_key"
    ON "share_grant" ("file_id", "recipient_user_id")
    WHERE "type" = 'USER'::"share_type"
      AND "revoked_at" IS NULL
      AND "file_id" IS NOT NULL;

COMMIT;
