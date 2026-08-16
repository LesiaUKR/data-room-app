-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "file_version_status" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "share_type" AS ENUM ('PUBLIC_LINK', 'USER');

-- CreateEnum
CREATE TYPE "share_role" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_room" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder" (
    "id" UUID NOT NULL,
    "data_room_id" UUID NOT NULL,
    "parent_folder_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "depth" SMALLINT NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file" (
    "id" UUID NOT NULL,
    "data_room_id" UUID NOT NULL,
    "folder_id" UUID NOT NULL,
    "current_version_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_version" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "size_bytes" BIGINT,
    "content_type" VARCHAR(255),
    "status" "file_version_status" NOT NULL DEFAULT 'PENDING',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "file_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_grant" (
    "id" UUID NOT NULL,
    "data_room_id" UUID NOT NULL,
    "folder_id" UUID,
    "file_id" UUID,
    "type" "share_type" NOT NULL,
    "role" "share_role" NOT NULL DEFAULT 'VIEWER',
    "token_hash" VARCHAR(64),
    "recipient_user_id" UUID,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "data_room_owner_idx" ON "data_room"("owner_id", "deleted_at");

-- CreateIndex
CREATE INDEX "folder_listing_idx" ON "folder"("data_room_id", "parent_folder_id", "normalized_name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "folder_id_data_room_id_key" ON "folder"("id", "data_room_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_current_version_id_key" ON "file"("current_version_id");

-- CreateIndex
CREATE INDEX "file_listing_idx" ON "file"("data_room_id", "folder_id", "normalized_name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "file_id_data_room_id_key" ON "file"("id", "data_room_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_version_object_key_key" ON "file_version"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "file_version_number_key" ON "file_version"("file_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "share_grant_token_hash_key" ON "share_grant"("token_hash");

-- CreateIndex
CREATE INDEX "share_grant_recipient_idx" ON "share_grant"("recipient_user_id", "data_room_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "data_room" ADD CONSTRAINT "data_room_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "folder_data_room_id_fkey" FOREIGN KEY ("data_room_id") REFERENCES "data_room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "folder_parent_folder_id_data_room_id_fkey" FOREIGN KEY ("parent_folder_id", "data_room_id") REFERENCES "folder"("id", "data_room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_data_room_id_fkey" FOREIGN KEY ("data_room_id") REFERENCES "data_room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_folder_id_data_room_id_fkey" FOREIGN KEY ("folder_id", "data_room_id") REFERENCES "folder"("id", "data_room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "file_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_version" ADD CONSTRAINT "file_version_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_version" ADD CONSTRAINT "file_version_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grant" ADD CONSTRAINT "share_grant_data_room_id_fkey" FOREIGN KEY ("data_room_id") REFERENCES "data_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grant" ADD CONSTRAINT "share_grant_folder_id_data_room_id_fkey" FOREIGN KEY ("folder_id", "data_room_id") REFERENCES "folder"("id", "data_room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grant" ADD CONSTRAINT "share_grant_file_id_data_room_id_fkey" FOREIGN KEY ("file_id", "data_room_id") REFERENCES "file"("id", "data_room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grant" ADD CONSTRAINT "share_grant_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grant" ADD CONSTRAINT "share_grant_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written PostgreSQL SQL, kept in the migration on purpose.
-- CHECK constraints and CREATE EXTENSION have no Prisma schema equivalent; partial
-- indexes do, but only behind the `partialIndexes` Preview flag we deliberately avoid.
-- Everything below is part of the same migration and is reviewed before it runs.
-- ---------------------------------------------------------------------------

-- Substring search over file names. The extension must exist before
-- the GIN index below can reference gin_trgm_ops.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- A folder cannot hold two active files with the same name. Soft-deleted rows are
-- excluded so a deleted name can be reused. This index, not a service check, is what
-- survives two concurrent uploads.
CREATE UNIQUE INDEX "file_active_name_key"
    ON "file" ("folder_id", "normalized_name")
    WHERE "deleted_at" IS NULL;

-- Same rule for folders inside one parent.
CREATE UNIQUE INDEX "folder_active_name_key"
    ON "folder" ("parent_folder_id", "normalized_name")
    WHERE "deleted_at" IS NULL;

-- Exactly one active root folder per data room. The index above cannot cover it:
-- Postgres treats NULLs as distinct, so two rows with a NULL parent never collide.
CREATE UNIQUE INDEX "folder_single_root_key"
    ON "folder" ("data_room_id")
    WHERE "parent_folder_id" IS NULL AND "deleted_at" IS NULL;

-- A grant targets at most one resource; both NULL means the whole data room.
ALTER TABLE "share_grant"
    ADD CONSTRAINT "share_grant_single_target_check"
    CHECK (NOT ("folder_id" IS NOT NULL AND "file_id" IS NOT NULL));

-- A public link carries a token hash and no recipient; a user grant is the mirror
-- image. This is what stops a link-shaped row from silently behaving as a user share.
ALTER TABLE "share_grant"
    ADD CONSTRAINT "share_grant_type_target_check"
    CHECK (
        ("type" = 'PUBLIC_LINK' AND "token_hash" IS NOT NULL AND "recipient_user_id" IS NULL)
        OR ("type" = 'USER' AND "recipient_user_id" IS NOT NULL AND "token_hash" IS NULL)
    );

-- Room-wide substring search on active file names only.
CREATE INDEX "file_name_search_idx"
    ON "file" USING GIN ("normalized_name" gin_trgm_ops)
    WHERE "deleted_at" IS NULL;
