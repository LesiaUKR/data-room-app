import { ContentsEntryKind } from '@data-room/contracts';
import { z } from 'zod';

import { type Prisma } from '../../libs/modules/database/index.js';
import { FolderEntity } from './folder.entity.js';
import { FILE_KIND_RANK, FOLDER_KIND_RANK } from './libs/helpers/index.js';
import { type FolderContentsEntry, type FolderWithOwner } from './libs/types/index.js';

const folderSelect = {
  id: true,
  dataRoomId: true,
  parentFolderId: true,
  name: true,
  depth: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FolderSelect;

const folderWithOwnerSelect = {
  ...folderSelect,
  dataRoom: { select: { ownerId: true } },
} satisfies Prisma.FolderSelect;

type FolderRow = Prisma.FolderGetPayload<{ select: typeof folderSelect }>;
type FolderWithOwnerRow = Prisma.FolderGetPayload<{ select: typeof folderWithOwnerSelect }>;

const toFolderEntity = (row: FolderRow): FolderEntity => FolderEntity.initialize(row);

const toFolderWithOwner = (row: FolderWithOwnerRow): FolderWithOwner => ({
  folder: toFolderEntity(row),
  ownerId: row.dataRoom.ownerId,
});

// positive() is the second guard that the internal root never reaches breadcrumbs
const folderAncestorRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    depth: z.number().int().positive(),
  }),
);

const contentsRowShape = {
  id: z.string().uuid(),
  name: z.string(),
  normalizedName: z.string(),
  updatedAt: z.date(),
};

const folderContentsRowsSchema = z.array(
  z.discriminatedUnion('kindRank', [
    z.object({
      ...contentsRowShape,
      kindRank: z.literal(FOLDER_KIND_RANK),
      sizeBytes: z.null(),
      contentType: z.null(),
      versionNumber: z.null(),
    }),
    z.object({
      ...contentsRowShape,
      kindRank: z.literal(FILE_KIND_RANK),
      sizeBytes: z.string().regex(/^\d+$/),
      contentType: z.string(),
      // int4, so no ::text round trip is needed the way size_bytes and SUM() need one
      versionNumber: z.number().int().positive(),
    }),
  ]),
);

type FolderContentsRow = z.infer<typeof folderContentsRowsSchema>[number];

const toFolderContentsEntry = (row: FolderContentsRow): FolderContentsEntry =>
  row.kindRank === FOLDER_KIND_RANK
    ? {
        kind: ContentsEntryKind.FOLDER,
        id: row.id,
        name: row.name,
        updatedAt: row.updatedAt,
      }
    : {
        kind: ContentsEntryKind.FILE,
        id: row.id,
        name: row.name,
        updatedAt: row.updatedAt,
        sizeBytes: row.sizeBytes,
        contentType: row.contentType,
        versionNumber: row.versionNumber,
      };

// Exact aggregates cross as ::text; a count becomes a number only once it is a safe integer
const countFromTextSchema = z
  .string()
  .regex(/^\d+$/)
  .refine((value) => Number.isSafeInteger(Number(value)))
  .transform(Number);

const retiredVersionRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    objectKey: z.string().min(1),
  }),
);

const folderSubtreeStatsRowsSchema = z.tuple([
  z.object({
    folderCount: countFromTextSchema,
    fileCount: countFromTextSchema,
    totalBytes: z.string().regex(/^\d+$/),
  }),
]);

export {
  folderAncestorRowsSchema,
  folderContentsRowsSchema,
  folderSelect,
  folderSubtreeStatsRowsSchema,
  folderWithOwnerSelect,
  retiredVersionRowsSchema,
  toFolderContentsEntry,
  toFolderEntity,
  toFolderWithOwner,
  type FolderContentsRow,
  type FolderRow,
  type FolderWithOwnerRow,
};
