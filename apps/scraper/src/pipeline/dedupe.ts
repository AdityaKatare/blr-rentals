import type { Db } from '@blr/db';
import { NotImplementedError } from '../errors';

export interface DedupeSummary {
  examined: number;
  attachedToExisting: number;
  propertiesCreated: number;
}

/**
 * TODO(M5): Tier-1 dedup for newly inserted / changed listings.
 *   1. Candidates in SQL: same bedrooms, |rent diff| ≤ 7 %, area within 12 % (when both known),
 *      ST_DWithin(location, 250 m) OR similarity(society_name) > 0.6 when geo is approximate.
 *   2. Score with scoreCandidate() from @blr/core (features computed in SQL where cheap).
 *   3. score ≥ DEDUPE_THRESHOLD → set property_id to the candidate's property (create one if
 *      the candidate has none); else create a fresh properties row. Maintain listing_count,
 *      rent_min/max, sources[] on properties.
 */
export async function dedupeListings(_db: Db, _listingIds: string[]): Promise<DedupeSummary> {
  throw new NotImplementedError('dedupeListings', 'M5');
}
