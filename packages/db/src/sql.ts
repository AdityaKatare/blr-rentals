import type { PendingQuery, Row } from 'postgres';
import type { Sql } from './client';

export type Fragment = PendingQuery<Row[]>;

export const pgArray = (values: readonly (string | number)[]): string => `{${values.join(',')}}`;

export const geographyPoint = (sql: Sql, lat: number, lng: number): Fragment =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

export const utcIso = (sql: Sql, column: Fragment): Fragment =>
  sql`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export function inTransaction<T>(sql: Sql, work: (tx: Sql) => Promise<T>): Promise<T> {
  return sql.begin((tx) => work(tx as unknown as Sql)) as Promise<T>;
}
