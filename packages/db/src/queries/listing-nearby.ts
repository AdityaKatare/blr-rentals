import { POI_CATEGORIES, type PoiCategory } from '@blr/core';
import type { Sql } from '../client';
import { inTransaction, pgArray, type Fragment } from '../sql';

export type PrecomputedCategory = Exclude<PoiCategory, 'metro'>;

export const PRECOMPUTED_CATEGORIES = POI_CATEGORIES.filter((c): c is PrecomputedCategory => c !== 'metro');

export const isPrecomputed = (c: PoiCategory): c is PrecomputedCategory => c !== 'metro';

export interface RefreshNearbyOptions {
  listingIds?: readonly string[];
  categories?: readonly PrecomputedCategory[];
}

const insertNearest = (sql: Sql, categories: readonly PrecomputedCategory[], only: Fragment) => sql`
  INSERT INTO listing_nearby (listing_id, category, name, distance_m)
  SELECT l.id, c.category, p.name, ST_Distance(p.location, l.location)
  FROM listings l
  CROSS JOIN unnest(${pgArray(categories)}::text[]) AS c(category)
  CROSS JOIN LATERAL (
    SELECT q.name, q.location
    FROM pois q
    WHERE q.category = c.category
    ORDER BY q.location <-> l.location
    LIMIT 1
  ) p
  WHERE l.location IS NOT NULL ${only}`;

export async function refreshListingNearby(sql: Sql, options: RefreshNearbyOptions = {}): Promise<number> {
  const categories = options.categories ?? PRECOMPUTED_CATEGORIES;
  if (!categories.length) return 0;

  if (options.listingIds) {
    if (!options.listingIds.length) return 0;
    const ids = pgArray(options.listingIds);
    return inTransaction(sql, async (tx) => {
      await tx`
        DELETE FROM listing_nearby
        WHERE listing_id = ANY (${ids}::uuid[]) AND category = ANY (${pgArray(categories)}::text[])`;
      const inserted = await insertNearest(tx, categories, tx`AND l.id = ANY (${ids}::uuid[])`);
      return inserted.count;
    });
  }

  let total = 0;
  for (const category of categories) {
    total += await inTransaction(sql, async (tx) => {
      await tx`SET LOCAL statement_timeout = '5min'`;
      await tx`DELETE FROM listing_nearby WHERE category = ${category}`;
      const inserted = await insertNearest(tx, [category], tx`AND true`);
      return inserted.count;
    });
  }
  return total;
}
