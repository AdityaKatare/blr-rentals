import { defineConfig } from 'drizzle-kit';

// Used only for `drizzle-kit studio` (and, later, `generate` to diff hand-written migrations).
// Migrations themselves are plain SQL in ./migrations, applied by src/migrate.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://blr:blr@localhost:5433/blr_rentals',
  },
});
