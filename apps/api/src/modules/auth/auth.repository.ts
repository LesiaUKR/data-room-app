import { isUniqueViolation, normalizeName } from '../../libs/helpers/index.js';
import { type DatabaseClient, type TransactionClient } from '../../libs/modules/database/index.js';
import { type UserEntity } from './auth.entity.js';
import { toUserEntity, userAccountSelect, userSelect, type UserAccountRow } from './auth.model.js';
import { type CreateAccountInput, type UserAccount } from './libs/types/index.js';

const ROOT_FOLDER_DEPTH = 0;

class AuthRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.database.user.findUnique({ where: { email }, select: userSelect });

    return row ? toUserEntity(row) : null;
  }

  /** One round trip for the whole session: identity, its data room, and that room's root folder. */
  public async findAccountByUserId(userId: string): Promise<UserAccount | null> {
    const row = await this.database.user.findUnique({
      where: { id: userId },
      select: userAccountSelect,
    });

    return row ? this.toUserAccount(row) : null;
  }

  /** `null` means the email was taken concurrently — the unique index is the real guard. */
  public async createAccount(
    input: CreateAccountInput,
    tx: TransactionClient,
  ): Promise<UserAccount | null> {
    try {
      const user = await tx.user.create({
        data: { email: input.email, passwordHash: input.passwordHash },
        select: userSelect,
      });

      const dataRoom = await tx.dataRoom.create({
        data: { ownerId: user.id, name: input.dataRoomName },
        select: { id: true, name: true },
      });

      const rootFolder = await tx.folder.create({
        data: {
          dataRoomId: dataRoom.id,
          parentFolderId: null,
          name: dataRoom.name,
          normalizedName: normalizeName(dataRoom.name),
          depth: ROOT_FOLDER_DEPTH,
        },
        select: { id: true },
      });

      return {
        user: toUserEntity(user),
        dataRoom: { id: dataRoom.id, name: dataRoom.name, rootFolderId: rootFolder.id },
      };
    } catch (error) {
      // A brand-new room and root folder cannot collide, so the only index in play is the email
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  private toUserAccount(row: UserAccountRow): UserAccount {
    const dataRoom = row.dataRooms[0];
    const rootFolder = dataRoom?.folders[0];

    // Sign-up writes all three rows in one transaction, so this state should be unreachable
    if (!dataRoom || !rootFolder) {
      throw new Error(`User ${row.id} has no usable data room`);
    }

    return {
      user: toUserEntity(row),
      dataRoom: { id: dataRoom.id, name: dataRoom.name, rootFolderId: rootFolder.id },
    };
  }
}

export { AuthRepository };
