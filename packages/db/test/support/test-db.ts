import { createDb, type DbHandle } from '../../src/client';
import { loadEnv } from '../../src/env';

loadEnv();

let warned = false;

export async function connectTestDb(probeTable: string): Promise<DbHandle | null> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    if (!warned) {
      warned = true;
      console.warn('TEST_DATABASE_URL is not set; skipping integration tests. Point it at a throwaway database, never at production.');
    }
    return null;
  }
  const handle = createDb(url);
  try {
    await handle.sql`SELECT 1 FROM ${handle.sql(probeTable)} LIMIT 1`;
    return handle;
  } catch {
    await handle.close().catch(() => undefined);
    return null;
  }
}
