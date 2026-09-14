import type { SourceSlug } from '@blr/core';
import type { Db } from '@blr/db';
import { NotImplementedError } from '../errors';

export interface StaleOptions {
  source: SourceSlug;
  now?: Date;
  /** active → stale after this many crawl intervals without being seen. */
  staleAfterIntervals?: number;
  /** stale → removed after this many days. */
  removeAfterDays?: number;
}

export interface StaleSummary {
  markedStale: number;
  markedRemoved: number;
}

/**
 * TODO(M2): status transitions, run only when the latest scrape_runs row for the
 * source is 'ok' (an outage must never mass-expire listings):
 *   active → stale    where last_seen_at < now − staleAfterIntervals × sources.crawl_interval_min
 *   stale  → removed  where last_seen_at < now − removeAfterDays, set removed_at,
 *                     and write a listing_changes row (field 'status').
 */
export async function markStale(_db: Db, _opts: StaleOptions): Promise<StaleSummary> {
  throw new NotImplementedError('markStale', 'M2');
}
