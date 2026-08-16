import { z } from 'zod';

import { NodeEnv } from '../../enums/index.js';

const DEFAULT_PORT = 3001;
const DEFAULT_LOG_LEVEL = 'info';
const POSTGRES_URL_PREFIX = 'postgres';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

// Deliberately not `.strict()`: `process.env` carries hundreds of unrelated keys
const configSchema = z.object({
  NODE_ENV: z.nativeEnum(NodeEnv).default(NodeEnv.DEVELOPMENT),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  DATABASE_URL: z.string().url().startsWith(POSTGRES_URL_PREFIX),
  DIRECT_URL: z.string().url().startsWith(POSTGRES_URL_PREFIX).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
});

type ConfigEnv = z.infer<typeof configSchema>;

export { configSchema, type ConfigEnv };
