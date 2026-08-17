import { config as loadEnvFile } from 'dotenv';
import { defineConfig } from 'prisma/config';

// The Prisma CLI runs as its own process and does not share the API's config module
loadEnvFile({ quiet: true });

const POOLED_HOST_MARKER = '-pooler';

const directUrl = process.env.DIRECT_URL;

// Prisma Migrate's advisory lock cannot survive the pooler
if (directUrl && directUrl.includes(POOLED_HOST_MARKER)) {
  throw new Error('DIRECT_URL must be the unpooled Neon endpoint, not the -pooler host.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/libs/modules/database/seed.ts',
  },
  // Declared only when present, so `prisma generate` runs on builds without database credentials
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
