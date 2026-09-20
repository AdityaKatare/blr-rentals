import { SearchQuerySchema, type SearchQuery } from '@blr/core';
import { findLocality, listLocalities, searchListings, type LocalityMatch, type SearchResult, type Sql } from '@blr/db';
import { withLargerHomes, type ParsedParams } from '@/utils/search-params';
import { getDb, reportDbError } from './db';

export type SearchOutcome =
  | { kind: 'ok'; result: SearchResult; localities: LocalityMatch[] }
  | { kind: 'no-center'; localities: LocalityMatch[] }
  | { kind: 'unknown-locality'; text: string; localities: LocalityMatch[] }
  | { kind: 'invalid'; issues: string[]; localities: LocalityMatch[] }
  | { kind: 'db-error'; message: string };

export const LOCALITIES_TTL_MS = 10 * 60 * 1000;

let localitiesCache: { at: number; localities: LocalityMatch[] } | null = null;

async function loadLocalities(sql: Sql, now = Date.now()): Promise<LocalityMatch[]> {
  if (localitiesCache && now - localitiesCache.at < LOCALITIES_TTL_MS) return localitiesCache.localities;
  const localities = await listLocalities(sql);
  localitiesCache = { at: now, localities };
  return localities;
}

export async function loadSearch(parsed: ParsedParams): Promise<SearchOutcome> {
  try {
    const { sql } = getDb();
    const localities = await loadLocalities(sql);
    if (!parsed.hasCenter) return { kind: 'no-center', localities };
    let center: SearchQuery['center'];
    if (parsed.explicitCenter) {
      center = parsed.explicitCenter;
    } else {
      const match = await findLocality(sql, parsed.localityText);
      if (!match) return { kind: 'unknown-locality', text: parsed.localityText, localities };
      center = { localityId: match.id };
    }
    const bedrooms = withLargerHomes(parsed.query.bedrooms ?? []);
    const query = SearchQuerySchema.safeParse({ ...parsed.query, bedrooms, center });
    if (!query.success) {
      return { kind: 'invalid', issues: query.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), localities };
    }
    return { kind: 'ok', result: await searchListings(sql, query.data), localities };
  } catch (err) {
    return { kind: 'db-error', message: reportDbError(err) };
  }
}
