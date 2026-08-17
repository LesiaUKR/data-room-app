import { type Prisma } from './generated/client.js';
import { prisma } from './prisma.js';

/** Handle a repository takes to join the caller's transaction; a call without it is outside one. */
type TransactionClient = Prisma.TransactionClient;

// Prisma's defaults (2s wait, 5s run) are tight for a subtree delete
const TRANSACTION_MAX_WAIT_MS = 5_000;
const TRANSACTION_TIMEOUT_MS = 15_000;

const transaction = async <T>(run: (tx: TransactionClient) => Promise<T>): Promise<T> =>
  prisma.$transaction(run, {
    maxWait: TRANSACTION_MAX_WAIT_MS,
    timeout: TRANSACTION_TIMEOUT_MS,
  });

export { transaction, type TransactionClient };
