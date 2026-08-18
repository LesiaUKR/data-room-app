import { type Prisma } from '../../libs/modules/database/index.js';
import { type DataRoomTarget, type ShareGrantTarget } from './libs/types/index.js';
import { ShareEntity } from './share.entity.js';

const shareSelect = {
  id: true,
  type: true,
  role: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  recipient: { select: { email: true } },
} satisfies Prisma.ShareGrantSelect;

const shareWithTargetSelect = {
  ...shareSelect,
  dataRoomId: true,
  folderId: true,
  fileId: true,
} satisfies Prisma.ShareGrantSelect;

const dataRoomTargetSelect = {
  id: true,
  name: true,
  ownerId: true,
  folders: {
    where: { parentFolderId: null, deletedAt: null },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.DataRoomSelect;

type ShareRow = Prisma.ShareGrantGetPayload<{ select: typeof shareSelect }>;
type ShareWithTargetRow = Prisma.ShareGrantGetPayload<{ select: typeof shareWithTargetSelect }>;
type DataRoomTargetRow = Prisma.DataRoomGetPayload<{ select: typeof dataRoomTargetSelect }>;

const toShareEntity = (row: ShareRow): ShareEntity =>
  ShareEntity.initialize({ ...row, recipientEmail: row.recipient?.email ?? null });

const toShareGrantTarget = (row: ShareWithTargetRow): ShareGrantTarget => ({
  share: toShareEntity(row),
  dataRoomId: row.dataRoomId,
  folderId: row.folderId,
  fileId: row.fileId,
});

// The partial index guarantees at most one active root, so the first row is the only row
const toDataRoomTarget = (row: DataRoomTargetRow): DataRoomTarget | null => {
  const rootFolderId = row.folders[0]?.id;

  return rootFolderId === undefined
    ? null
    : { dataRoomId: row.id, ownerId: row.ownerId, name: row.name, rootFolderId };
};

export {
  dataRoomTargetSelect,
  shareSelect,
  shareWithTargetSelect,
  toDataRoomTarget,
  toShareEntity,
  toShareGrantTarget,
};
