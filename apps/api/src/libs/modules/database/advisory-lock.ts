import { type TransactionClient } from './transaction.js';

const LOCK_KEY_HEX_DIGITS = 16;

// pg_advisory_xact_lock takes a bigint, so the room id is folded into its first 64 bits
const toLockKey = (dataRoomId: string): bigint =>
  BigInt.asIntN(64, BigInt(`0x${dataRoomId.replaceAll('-', '').slice(0, LOCK_KEY_HEX_DIGITS)}`));

/**
 * Serializes writes within one data room for the caller's transaction. Without it, READ
 * COMMITTED lets a folder be created under a parent whose subtree delete is already running:
 * the foreign key still passes, because a soft-deleted parent row physically remains.
 */
const lockDataRoom = async (dataRoomId: string, tx: TransactionClient): Promise<void> => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${toLockKey(dataRoomId)})`;
};

export { lockDataRoom };
