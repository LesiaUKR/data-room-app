import { type Prisma } from './generated/client.js';
import { prisma } from './prisma.js';

/**
 * The handle a repository receives when it must join a caller's unit of work. A repository
 * call made without it is not part of anyone's transaction, however it is nested in code.
 */
type TransactionClient = Prisma.TransactionClient;

// Prisma's defaults (2s wait, 5s run) are tight for a subtree delete over a deep folder tree.
const TRANSACTION_MAX_WAIT_MS = 5_000;
const TRANSACTION_TIMEOUT_MS = 15_000;

const transaction = async <T>(run: (tx: TransactionClient) => Promise<T>): Promise<T> =>
  prisma.$transaction(run, {
    maxWait: TRANSACTION_MAX_WAIT_MS,
    timeout: TRANSACTION_TIMEOUT_MS,
  });

export { transaction, type TransactionClient };
