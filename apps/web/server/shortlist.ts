import { listingsByIds, type SearchHit } from '@blr/db';
import { cookies } from 'next/headers';
import { SHORTLIST_COOKIE } from '@/constants/shortlist';
import { parseShortlist } from '@/utils/shortlist';
import { getDb, reportDbError } from './db';

export async function readShortlistIds(): Promise<string[]> {
  return parseShortlist((await cookies()).get(SHORTLIST_COOKIE)?.value);
}

export type ShortlistOutcome = { active: SearchHit[]; gone: SearchHit[] } | { error: string };

export async function loadShortlist(ids: readonly string[]): Promise<ShortlistOutcome> {
  if (!ids.length) return { active: [], gone: [] };
  try {
    const hits = await listingsByIds(getDb().sql, ids);
    return {
      active: hits.filter((h) => h.status === 'active'),
      gone: hits.filter((h) => h.status !== 'active'),
    };
  } catch (err) {
    return { error: reportDbError(err) };
  }
}
