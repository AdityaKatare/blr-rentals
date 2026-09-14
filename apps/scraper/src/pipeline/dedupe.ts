import type { Db } from '@blr/db';
import { NotImplementedError } from '../errors';

export interface DedupeSummary {
  examined: number;
  attachedToExisting: number;
  propertiesCreated: number;
}

export async function dedupeListings(_db: Db, _listingIds: string[]): Promise<DedupeSummary> {
  throw new NotImplementedError('dedupeListings', 'M5');
}
