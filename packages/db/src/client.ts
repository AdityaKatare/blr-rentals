import postgres from 'postgres';

export type Sql = postgres.Sql;

export interface DbHandle {
  sql: Sql;
  close: () => Promise<void>;
}

const DATE_TIME_TYPE_OIDS = [1082, 1083, 1114, 1115, 1182, 1184, 1185, 1231];
const JSON_TYPE_OIDS = [114, 3802];
const passThrough = (value: unknown) => value;

function keepDatesAsTextAndJsonPreEncoded(sql: Sql): void {
  for (const oid of DATE_TIME_TYPE_OIDS) {
    sql.options.parsers[oid] = passThrough;
    sql.options.serializers[oid] = passThrough;
  }
  for (const oid of JSON_TYPE_OIDS) sql.options.serializers[oid] = passThrough;
}

export function createDb(url: string | undefined = process.env.DATABASE_URL): DbHandle {
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and start the database (pnpm db:up).');
  }
  const sql = postgres(url, { max: 5, prepare: false, onnotice: () => undefined });
  keepDatesAsTextAndJsonPreEncoded(sql);
  return {
    sql,
    close: () => sql.end({ timeout: 5 }),
  };
}
