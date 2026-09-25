import { isUuid, type SourceSlug } from '@blr/core';
import type { Sql } from '../client';
import { pgArray, utcIso } from '../sql';
import type { SearchHit } from '../types';
import { enrichHits, hitColumns, toHit, type ListingRow } from './hits';

export interface SourceLookup {
  hit: SearchHit;
  lastSeenAt: string;
}

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

export async function listingBySourceId(
  sql: Sql,
  source: SourceSlug,
  sourceListingId: string,
  now: Date = new Date(),
): Promise<SourceLookup | null> {
  const [row] = await sql<(ListingRow & { last_seen_at: string })[]>`
    SELECT ${hitColumns(sql, null)}, ${utcIso(sql, sql`l.last_seen_at`)} AS last_seen_at
    FROM listings l
    JOIN sources s ON s.id = l.source_id
    WHERE s.slug = ${source} AND l.source_listing_id = ${sourceListingId}
    LIMIT 1`;
  if (!row) return null;
  const hit = toHit(row, null);
  await enrichHits(sql, [hit], now);
  return { hit, lastSeenAt: row.last_seen_at };
}
