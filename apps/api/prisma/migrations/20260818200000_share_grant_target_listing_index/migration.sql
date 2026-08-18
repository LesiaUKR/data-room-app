-- ---------------------------------------------------------------------------
-- Hand-written, like the partial indexes before it: Prisma cannot express a
-- WHERE clause on an index without the `partialIndexes` Preview flag this
-- project avoids. Additive only - no column, no row, no object dropped.
-- Rollback is DROP INDEX.
--
-- Serves GET /shares, which asks for the active grants on ONE resource, newest
-- first. The existing share_grant_recipient_idx answers a different question -
-- "what has been shared WITH this person" - so nothing covered this listing and
-- the work grew with the size of the whole table instead of the page.
--
-- The column order matches the filter, and `id DESC` matches the ORDER BY, so
-- Postgres reads the page straight off the index instead of sorting first.
-- uuid v7 ids are time-ordered, which is what makes id a valid "newest first".
-- Revoked rows are excluded because the listing never shows them; keeping them
-- out is what keeps the index small.
-- ---------------------------------------------------------------------------

BEGIN;

CREATE INDEX "share_grant_target_active_idx"
    ON "share_grant" ("data_room_id", "folder_id", "file_id", "id" DESC)
    WHERE "revoked_at" IS NULL;

COMMIT;
