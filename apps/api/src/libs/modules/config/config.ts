import { config as loadEnvFile } from 'dotenv';

import { NodeEnv } from '../../enums/index.js';
import { configSchema } from './config.schema.js';

// No `override`: a value already present in the environment wins over the file, so a deployment
// variable can never be silently replaced by a local .env
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
} as const;

export { config };
