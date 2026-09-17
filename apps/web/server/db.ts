import { createDb, loadEnv, type DbHandle } from '@blr/db';

const globalRef = globalThis as unknown as { __blrDb?: DbHandle };

export function getDb(): DbHandle {
  if (!globalRef.__blrDb) {
    loadEnv();
    globalRef.__blrDb = createDb();
  }
  return globalRef.__blrDb;
}
