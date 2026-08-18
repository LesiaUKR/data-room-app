import { ShareRole, ShareType } from '@data-room/contracts';

import { type DatabaseClient, type TransactionClient } from '../../libs/modules/database/index.js';
import {
  type CreateShareRecord,
  type DataRoomTarget,
  type GrantSlot,
  type ListSharesInput,
  type ShareGrantTarget,
  type SharesPage,
} from './libs/types/index.js';
import { type ShareEntity } from './share.entity.js';
import {
  dataRoomTargetSelect,
  shareSelect,
  shareWithTargetSelect,
  toDataRoomTarget,
  toShareEntity,
  toShareGrantTarget,
} from './share.model.js';

class ShareRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  /** The only read of DataRoom outside the auth module: no data-rooms module exists yet. */
  public async findDataRoomTarget(
    dataRoomId: string,
    tx?: TransactionClient,
  ): Promise<DataRoomTarget | null> {
    const row = await (tx ?? this.database).dataRoom.findFirst({
      where: { id: dataRoomId, deletedAt: null },
      select: dataRoomTargetSelect,
    });

    return row ? toDataRoomTarget(row) : null;
  }

  /**
   * Filters revoked rows only, never expiry: an expired-but-unrevoked row still occupies the
   * unique slot, and the create flow has to see it in order to retire it.
   */
  public async findUnrevokedUserGrant(
    slot: GrantSlot,
    tx: TransactionClient,
  ): Promise<ShareEntity | null> {
    const row = await tx.shareGrant.findFirst({
      where: {
        dataRoomId: slot.dataRoomId,
        folderId: slot.folderId,
        fileId: slot.fileId,
        recipientUserId: slot.recipientUserId,
        type: ShareType.USER,
        revokedAt: null,
      },
      select: shareSelect,
    });

    return row ? toShareEntity(row) : null;
  }

  public async findById(shareId: string): Promise<ShareGrantTarget | null> {
    const row = await this.database.shareGrant.findFirst({
      where: { id: shareId },
      select: shareWithTargetSelect,
    });

    return row ? toShareGrantTarget(row) : null;
  }

  public async findActiveByTokenHash(tokenHash: string): Promise<ShareGrantTarget | null> {
    const row = await this.database.shareGrant.findFirst({
      where: {
        tokenHash,
        type: ShareType.PUBLIC_LINK,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: shareWithTargetSelect,
    });

    return row ? toShareGrantTarget(row) : null;
  }

  /**
   * A unique violation is deliberately not caught here: PostgreSQL aborts the whole transaction
   * on one, so the service restarts the transaction instead of reading inside a dead one.
   */
  public async create(record: CreateShareRecord, tx: TransactionClient): Promise<ShareEntity> {
    const row = await tx.shareGrant.create({
      data: {
        dataRoomId: record.dataRoomId,
        folderId: record.folderId,
        fileId: record.fileId,
        type: record.type,
        role: ShareRole.VIEWER,
        tokenHash: record.tokenHash,
        recipientUserId: record.recipientUserId,
        createdById: record.createdById,
      },
      select: shareSelect,
    });

    return toShareEntity(row);
  }

  /** Idempotent: a second revoke updates nothing and is still a success for the caller. */
  public async revoke(shareId: string, tx?: TransactionClient): Promise<void> {
    await (tx ?? this.database).shareGrant.updateMany({
      where: { id: shareId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async listActive(input: ListSharesInput): Promise<SharesPage> {
    const take = input.limit + 1;

    const rows = await this.database.shareGrant.findMany({
      where: {
        dataRoomId: input.dataRoomId,
        folderId: input.folderId,
        fileId: input.fileId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(input.cursorId === null ? {} : { id: { lt: input.cursorId } }),
      },
      // uuid v7 ids are time-ordered, so the primary key is a stable newest-first keyset
      orderBy: { id: 'desc' },
      take,
      select: shareSelect,
    });

    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;

    return {
      items: page.map(toShareEntity),
      lastId: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }
}

export { ShareRepository };
