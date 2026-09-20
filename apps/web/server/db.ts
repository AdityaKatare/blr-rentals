import { errorMessage } from '@blr/core';
import { createDb, loadEnv, type DbHandle, type DbOptions } from '@blr/db';

const globalRef = globalThis as unknown as { __blrDb?: DbHandle };

const SERVERLESS_POOL: DbOptions = { max: 3, idle_timeout: 20, connect_timeout: 10, max_lifetime: 30 * 60 };

export const DB_ERROR_MESSAGE = 'The listings database could not be reached. Try again in a moment.';

export function getDb(): DbHandle {
  if (!globalRef.__blrDb) {
    loadEnv();
    globalRef.__blrDb = createDb(process.env.DATABASE_URL, SERVERLESS_POOL);
  }
  return globalRef.__blrDb;
}

export function reportDbError(err: unknown): string {
  console.error('[db]', err);
  return process.env.NODE_ENV === 'production' ? DB_ERROR_MESSAGE : errorMessage(err);
}
