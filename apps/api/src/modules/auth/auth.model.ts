import { type Prisma } from '../../libs/modules/database/index.js';
import { UserEntity } from './auth.entity.js';

const userSelect = {
  id: true,
  email: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

const userAccountSelect = {
  ...userSelect,
  dataRooms: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: {
      id: true,
      name: true,
      // The room's only parentless folder; the partial unique index guarantees at most one
      folders: {
        where: { parentFolderId: null, deletedAt: null },
        take: 1,
        select: { id: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;
type UserAccountRow = Prisma.UserGetPayload<{ select: typeof userAccountSelect }>;

const toUserEntity = (row: UserRow): UserEntity => UserEntity.initialize(row);

export { toUserEntity, userAccountSelect, userSelect, type UserAccountRow, type UserRow };
