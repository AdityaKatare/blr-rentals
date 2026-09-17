import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type DbHandle } from '../client';
import { loadEnv } from '../env';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

export async function migrate(handle: DbHandle): Promise<{ ran: string[]; skipped: number }> {
  const { sql } = handle;
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;
  const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    ran.push(file);
  }
  return { ran, skipped: files.length - ran.length };
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  loadEnv();
  const handle = createDb();
  migrate(handle)
    .then((r) => {
      console.log(`migrations applied: ${r.ran.length ? r.ran.join(', ') : 'none'} (${r.skipped} already applied)`);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => handle.close());
}
