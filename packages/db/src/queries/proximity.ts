import { centroidCanMatch, type NearCriterion, type PoiCategory } from '@blr/core';
import type { Sql } from '../client';
import { pgArray, type Fragment } from '../sql';
import type { NearbyPoi } from '../types';
import { isPrecomputed, type PrecomputedCategory } from './listing-nearby';

export function nearConditions(sql: Sql, near: readonly NearCriterion[]): Fragment[] {
  return near.flatMap((c) => {
    const within = isPrecomputed(c.category)
      ? sql`EXISTS (
          SELECT 1 FROM listing_nearby n
          WHERE n.listing_id = l.id AND n.category = ${c.category} AND n.distance_m <= ${c.withinM})`
      : sql`EXISTS (
          SELECT 1 FROM metro_stations m
          WHERE m.status = 'open' AND ST_DWithin(m.location, l.location, ${c.withinM}))`;
    return centroidCanMatch(c.withinM) ? [within] : [sql`l.geo_accuracy IN ('exact', 'approximate')`, within];
  });
}

export const cardCategories = (near: readonly NearCriterion[]): PrecomputedCategory[] =>
  near.map((c) => c.category).filter(isPrecomputed);

export async function nearestPois(
  sql: Sql,
  ids: readonly string[],
  categories: readonly PoiCategory[],
): Promise<Map<string, NearbyPoi[]>> {
  const out = new Map<string, NearbyPoi[]>();
  const wanted = categories.filter(isPrecomputed);
  if (!ids.length || !wanted.length) return out;
  const rows = await sql<{ id: string; category: PrecomputedCategory; name: string | null; distance_m: number; approximate: boolean }[]>`
    SELECT n.listing_id AS id, n.category, n.name, n.distance_m, l.geo_accuracy = 'locality_centroid' AS approximate
    FROM listing_nearby n
    JOIN listings l ON l.id = n.listing_id
    WHERE n.listing_id = ANY (${pgArray(ids)}::uuid[]) AND n.category = ANY (${pgArray(wanted)}::text[])`;
  const order = new Map(wanted.map((c, i) => [c, i]));
  rows.sort((a, b) => order.get(a.category)! - order.get(b.category)!);
  for (const r of rows) {
    const list = out.get(r.id) ?? [];
    list.push({ category: r.category, name: r.name, distanceM: Math.round(r.distance_m), approximate: r.approximate });
    out.set(r.id, list);
  }
  return out;
}
