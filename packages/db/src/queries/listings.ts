import { isUuid } from '@blr/core';
import type { Sql } from '../client';
import { pgArray } from '../sql';
import type { SearchHit } from '../types';
import { enrichHits, hitColumns, toHit, type ListingRow } from './hits';

export async function listingsByIds(sql: Sql, ids: readonly string[], now: Date = new Date()): Promise<SearchHit[]> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const rows = await sql<ListingRow[]>`
    SELECT ${hitColumns(sql, null)}
    FROM listings l
    JOIN sources s ON s.id = l.source_id
    WHERE l.id = ANY (${pgArray(valid)}::uuid[])`;
  const order = new Map(valid.map((id, i) => [id.toLowerCase(), i]));
  const hits = rows.map((r) => toHit(r, null)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  await enrichHits(sql, hits, now);
  return hits;
}
