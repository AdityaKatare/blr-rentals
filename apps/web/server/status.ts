import { listingCounts, recentRuns, sourceOverview, type ListingCounts, type RecentRun, type SourceOverview } from '@blr/db';
import { STATUS_RECENT_RUNS } from '@/constants/search';
import { getDb, reportDbError } from './db';

export type StatusOutcome = { runs: RecentRun[]; sources: SourceOverview[]; counts: ListingCounts } | { error: string };

export async function loadStatus(): Promise<StatusOutcome> {
  try {
    const { sql } = getDb();
    const [runs, sources, counts] = await Promise.all([
      recentRuns(sql, STATUS_RECENT_RUNS),
      sourceOverview(sql),
      listingCounts(sql),
    ]);
    return { runs, sources, counts };
  } catch (err) {
    return { error: reportDbError(err) };
  }
}
