import { centroidCanMatch, type NearCriterion, type PoiCategory } from '@blr/core';
import type { Sql } from '../client';
import { pgArray, type Fragment } from '../sql';
import type { NearbyPoi } from '../types';

export function poiPoints(sql: Sql, category: PoiCategory): Fragment {
  if (category === 'metro') return sql`SELECT name, location FROM metro_stations WHERE status = 'open'`;
  return sql`SELECT name, location FROM pois WHERE category = ${category}`;
}

export function nearConditions(sql: Sql, near: readonly NearCriterion[]): Fragment[] {
  return near.flatMap((c) => {
    const within = sql`EXISTS (
      SELECT 1 FROM (${poiPoints(sql, c.category)}) p
      WHERE ST_DWithin(p.location, l.location, ${c.withinM}))`;
    return centroidCanMatch(c.withinM) ? [within] : [sql`l.geo_accuracy IN ('exact', 'approximate')`, within];
  });
}

export const cardCategories = (near: readonly NearCriterion[]): PoiCategory[] =>
  near.map((c) => c.category).filter((c) => c !== 'metro');

export async function nearestPois(
  sql: Sql,
  ids: readonly string[],
  categories: readonly PoiCategory[],
): Promise<Map<string, NearbyPoi[]>> {
  const out = new Map<string, NearbyPoi[]>();
  if (!ids.length || !categories.length) return out;
  const idList = pgArray(ids);
  const parts = categories.map(
    (category, i) => sql`
      SELECT l.id, ${i}::int AS ord, ${category}::text AS category, p.name,
             ST_Distance(p.location, l.location) AS distance_m,
             l.geo_accuracy = 'locality_centroid' AS approximate
      FROM listings l
      CROSS JOIN LATERAL (
        SELECT q.name, q.location
        FROM (${poiPoints(sql, category)}) q
        ORDER BY q.location <-> l.location
        LIMIT 1
      ) p
      WHERE l.id = ANY (${idList}::uuid[]) AND l.location IS NOT NULL`,
  );
  const union = parts.reduce((acc, part) => sql`${acc} UNION ALL ${part}`);
  const rows = await sql<
    { id: string; ord: number; category: PoiCategory; name: string | null; distance_m: number; approximate: boolean }[]
  >`SELECT * FROM (${union}) n ORDER BY id, ord`;
  for (const r of rows) {
    const list = out.get(r.id) ?? [];
    list.push({ category: r.category, name: r.name, distanceM: Math.round(r.distance_m), approximate: r.approximate });
    out.set(r.id, list);
  }
  return out;
}
