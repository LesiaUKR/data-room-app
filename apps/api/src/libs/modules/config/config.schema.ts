import { passwordSchema } from '@data-room/contracts';
import { z } from 'zod';

import { NodeEnv } from '../../enums/index.js';

const DEFAULT_PORT = 3001;
const DEFAULT_LOG_LEVEL = 'info';
const POSTGRES_URL_PREFIX = 'postgres';
const JWT_SECRET_MIN_LENGTH = 32;

// The example file must never boot a real deployment: reject its value explicitly
const JWT_SECRET_PLACEHOLDERS = ['replace-with-a-long-random-string', 'change-me', 'secret'];

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

// Deliberately not `.strict()`: `process.env` carries hundreds of unrelated keys
const configSchema = z.object({
  NODE_ENV: z.nativeEnum(NodeEnv).default(NodeEnv.DEVELOPMENT),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  DATABASE_URL: z.string().url().startsWith(POSTGRES_URL_PREFIX),
  DIRECT_URL: z.string().url().startsWith(POSTGRES_URL_PREFIX).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(JWT_SECRET_MIN_LENGTH)
    .refine((value) => !JWT_SECRET_PLACEHOLDERS.includes(value), {
      message: 'JWT_SECRET is still an example placeholder — generate a real random secret',
    }),
  // An unedited `.env.example` leaves this blank; treat that as absent so the API still starts,
  // and hold a provided value to the same policy sign-in enforces
  SEED_PASSWORD: z.preprocess(
    (value) => (value === '' ? undefined : value),
    passwordSchema.optional(),
  ),
});

type ConfigEnv = z.infer<typeof configSchema>;

export { configSchema, type ConfigEnv };
