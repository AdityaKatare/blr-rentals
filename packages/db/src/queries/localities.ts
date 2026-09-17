import type { Sql } from '../client';
import type { LocalityMatch } from '../types';

const localityColumns = (sql: Sql) =>
  sql`id, slug, name, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng`;

export async function listLocalities(sql: Sql): Promise<LocalityMatch[]> {
  return sql<LocalityMatch[]>`
    SELECT ${localityColumns(sql)}
    FROM localities ORDER BY name`;
}

export async function findLocality(sql: Sql, text: string): Promise<LocalityMatch | null> {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  const [row] = await sql<LocalityMatch[]>`
    SELECT ${localityColumns(sql)}
    FROM localities
    WHERE lower(name) = ${q} OR slug = ${q} OR ${q} = ANY (SELECT lower(a) FROM unnest(aliases) a)
       OR similarity(name, ${q}) > 0.3
    ORDER BY (lower(name) = ${q} OR slug = ${q}) DESC,
             (${q} = ANY (SELECT lower(a) FROM unnest(aliases) a)) DESC,
             similarity(name, ${q}) DESC
    LIMIT 1`;
  return row ?? null;
}

export async function localityById(sql: Sql, id: number): Promise<LocalityMatch | null> {
  const [row] = await sql<LocalityMatch[]>`
    SELECT ${localityColumns(sql)}
    FROM localities WHERE id = ${id}`;
  return row ?? null;
}
