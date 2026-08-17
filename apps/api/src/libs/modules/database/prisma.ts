import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config/index.js';
import { type Prisma, PrismaClient } from './generated/client.js';

// One per serverless invocation; the pg default of 10 exhausts Neon's pooler
const SERVERLESS_POOL_SIZE = 1;

// pg waits for a free connection forever by default, which would hang /health
const CONNECTION_TIMEOUT_MS = 5_000;

const logLevels: Prisma.LogLevel[] = config.isDevelopment
  ? ['query', 'warn', 'error']
  : ['warn', 'error'];

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl,
    max: SERVERLESS_POOL_SIZE,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });

  return new PrismaClient({ adapter, log: logLevels });
};

// The module can be evaluated twice in one process; globalThis outlives module scope
const globalForPrisma = globalThis as typeof globalThis & {
  dataRoomPrisma?: PrismaClient;
};

const prisma = globalForPrisma.dataRoomPrisma ?? createPrismaClient();

globalForPrisma.dataRoomPrisma = prisma;

type DatabaseClient = typeof prisma;

export { prisma, type DatabaseClient };
