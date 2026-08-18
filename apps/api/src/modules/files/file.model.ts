import { z } from 'zod';

import { type Prisma } from '../../libs/modules/database/index.js';
import { FileVersionEntity } from './file-version.entity.js';
import { FileEntity } from './file.entity.js';
import { type FileVersionWithFile, type FileWithOwner } from './libs/types/index.js';

const fileSelect = {
  id: true,
  dataRoomId: true,
  folderId: true,
  currentVersionId: true,
  name: true,
  normalizedName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FileSelect;

const fileWithOwnerSelect = {
  ...fileSelect,
  dataRoom: { select: { ownerId: true } },
} satisfies Prisma.FileSelect;

const fileVersionSelect = {
  id: true,
  fileId: true,
  versionNumber: true,
  objectKey: true,
  sizeBytes: true,
  contentType: true,
  status: true,
} satisfies Prisma.FileVersionSelect;

const fileVersionWithFileSelect = {
  ...fileVersionSelect,
  file: { select: fileWithOwnerSelect },
} satisfies Prisma.FileVersionSelect;

type FileRow = Prisma.FileGetPayload<{ select: typeof fileSelect }>;
type FileWithOwnerRow = Prisma.FileGetPayload<{ select: typeof fileWithOwnerSelect }>;
type FileVersionRow = Prisma.FileVersionGetPayload<{ select: typeof fileVersionSelect }>;
type FileVersionWithFileRow = Prisma.FileVersionGetPayload<{
  select: typeof fileVersionWithFileSelect;
}>;

const toFileEntity = (row: FileRow): FileEntity => FileEntity.initialize(row);

const toFileWithOwner = (row: FileWithOwnerRow): FileWithOwner => ({
  file: toFileEntity(row),
  ownerId: row.dataRoom.ownerId,
});

const toFileVersionEntity = (row: FileVersionRow): FileVersionEntity =>
  FileVersionEntity.initialize(row);

const toFileVersionWithFile = (row: FileVersionWithFileRow): FileVersionWithFile => ({
  ...toFileWithOwner(row.file),
  version: toFileVersionEntity(row),
});

const retiredVersionRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    objectKey: z.string().min(1),
  }),
);

export {
  fileSelect,
  fileVersionSelect,
  fileVersionWithFileSelect,
  fileWithOwnerSelect,
  retiredVersionRowsSchema,
  toFileEntity,
  toFileVersionEntity,
  toFileVersionWithFile,
  toFileWithOwner,
  type FileRow,
  type FileVersionRow,
  type FileVersionWithFileRow,
  type FileWithOwnerRow,
};
