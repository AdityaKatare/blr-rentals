import { createDb, loadEnv, type DbHandle } from '@blr/db';

const globalRef = globalThis as unknown as { __blrDb?: DbHandle };

/** One connection pool per server process (survives Next dev hot reloads). */
export function getDb(): DbHandle {
  if (!globalRef.__blrDb) {
    loadEnv();
    globalRef.__blrDb = createDb();
  }
  return globalRef.__blrDb;
}
