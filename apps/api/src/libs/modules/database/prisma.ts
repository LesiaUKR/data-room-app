import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config/index.js';
import { type Prisma, PrismaClient } from './generated/client.js';

// One connection per instance: every serverless invocation is isolated, and the pg driver
// would otherwise default to 10 — Neon's pooler runs out long before that is useful.
const SERVERLESS_POOL_SIZE = 1;

// pg waits for a free connection indefinitely by default. With a pool of one, a stalled query
// would make every later caller — including /health — hang until the platform kills the request.
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

// The module can be evaluated more than once in a single process (dev watch, bundling), and
// each evaluation would open its own connection. globalThis outlives module scope.
const globalForPrisma = globalThis as typeof globalThis & {
  dataRoomPrisma?: PrismaClient;
};

const prisma = globalForPrisma.dataRoomPrisma ?? createPrismaClient();

globalForPrisma.dataRoomPrisma = prisma;

type DatabaseClient = typeof prisma;

export { prisma, type DatabaseClient };
