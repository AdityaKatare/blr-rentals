import type { Sql } from '../client';
import type { ListingCounts, SourceOverview } from '../types';

export async function sourceOverview(sql: Sql): Promise<SourceOverview[]> {
  return sql<SourceOverview[]>`
    SELECT s.slug, s.enabled, s.transport::text AS transport, s.crawl_interval_min AS "crawlIntervalMin",
           (SELECT count(*)::int FROM listings l WHERE l.source_id = s.id AND l.status = 'active') AS "activeListings"
    FROM sources s
    ORDER BY s.id`;
}

export async function listingCounts(sql: Sql): Promise<ListingCounts> {
  const [counts] = await sql<ListingCounts[]>`
    SELECT
      (SELECT count(*)::int FROM listings WHERE status = 'active') AS "activeListings",
      (SELECT count(*)::int FROM properties WHERE listing_count > 0) AS homes,
      (SELECT count(*)::int FROM properties WHERE listing_count > 1) AS "groupedHomes",
      (SELECT count(*)::int FROM listings WHERE status = 'active' AND property_id IS NULL) AS ungrouped`;
  return counts!;
}
