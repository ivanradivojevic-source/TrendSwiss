import { defineConfig, env } from 'prisma/config';
import dotenv from 'dotenv';

// Prisma CLI (v7+) doesn't automatically load Next.js `.env.local`.
// Load `.env.local` first (dev), then `.env` as fallback.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});

