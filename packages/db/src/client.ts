import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  /** Raw postgres-js client for PostGIS-heavy SQL and migrations. */
  sql: postgres.Sql;
  close: () => Promise<void>;
}

export function createDb(url: string | undefined = process.env.DATABASE_URL): DbHandle {
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and start the database (pnpm db:up).');
  }
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => undefined });
  return {
    db: drizzle(client, { schema }),
    sql: client,
    close: () => client.end({ timeout: 5 }),
  };
}
