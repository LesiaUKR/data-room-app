import { config as loadEnvFile } from 'dotenv';

import { NodeEnv } from '../../enums/index.js';
import { configSchema } from './config.schema.js';

// No `override`: a deployment variable must never be replaced by a local .env
loadEnvFile({ quiet: true });

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n  ');

  throw new Error(`Invalid environment configuration:\n  ${issues}`);
}

const env = parsed.data;

const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  blobReadWriteToken: env.BLOB_READ_WRITE_TOKEN,
  isDevelopment: env.NODE_ENV === NodeEnv.DEVELOPMENT,
  isProduction: env.NODE_ENV === NodeEnv.PRODUCTION,
  jwtSecret: env.JWT_SECRET,
  seedPassword: env.SEED_PASSWORD,
} as const;

export { config };
