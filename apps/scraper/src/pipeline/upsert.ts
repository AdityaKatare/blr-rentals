import { createHash } from 'node:crypto';
import type { NormalizedListing } from '@blr/core';
import type { Db } from '@blr/db';
import { NotImplementedError } from '../errors';

export interface UpsertSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  /** listing_changes rows written (rent / deposit / status / available_from). */
  changes: number;
}

export interface ListingStore {
  upsertMany(listings: NormalizedListing[]): Promise<UpsertSummary>;
}

/** JSON with sorted keys so equal objects hash equal regardless of key order. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Content hash over the normalised fields (raw excluded). Stored as
 * listings.raw_hash; an equal hash means "touch last_seen_at and move on".
 */
export function listingHash(listing: NormalizedListing): string {
  const { raw: _raw, ...content } = listing;
  return createHash('sha256').update(stableStringify(content)).digest('hex');
}

/**
 * TODO(M2): for each listing, by (source_id, source_listing_id):
 *   - not found          → INSERT (first_seen = last_seen = now)
 *   - found, same hash   → UPDATE last_seen_at only
 *   - found, differs     → UPDATE fields + last_seen_at; INSERT listing_changes
 *                          for rent / deposit / status / available_from that changed;
 *                          status back to 'active' if it had gone stale.
 * Use one transaction per page; return counters for scrape_runs.
 */
export function createListingStore(_db: Db): ListingStore {
  return {
    async upsertMany() {
      throw new NotImplementedError('createListingStore.upsertMany', 'M2');
    },
  };
}
