import { DEFAULT_RADIUS_KM, SearchQuerySchema, type SearchQuery } from '@blr/core';
import {
  findLocality,
  listLocalities,
  localityCoverage,
  searchListings,
  type LocalityCoverage,
  type LocalityMatch,
  type SearchResult,
  type Sql,
} from '@blr/db';
import { withLargerHomes, type ParsedParams } from '@/utils/search-params';
import { getDb, reportDbError } from './db';

export type SearchOutcome =
  | { kind: 'ok'; result: SearchResult; localities: LocalityMatch[] }
  | { kind: 'no-center'; localities: LocalityMatch[]; coverage: LocalityCoverage[] }
  | { kind: 'unknown-locality'; text: string; localities: LocalityMatch[] }
  | { kind: 'invalid'; issues: string[]; localities: LocalityMatch[] }
  | { kind: 'db-error'; message: string };

export const LOCALITIES_TTL_MS = 10 * 60 * 1000;

interface Cached<T> {
  at: number;
  value: T;
}

let localitiesCache: Cached<LocalityMatch[]> | null = null;
let coverageCache: Cached<LocalityCoverage[]> | null = null;

async function loadLocalities(sql: Sql, now = Date.now()): Promise<LocalityMatch[]> {
  if (localitiesCache && now - localitiesCache.at < LOCALITIES_TTL_MS) return localitiesCache.value;
  const localities = await listLocalities(sql);
  localitiesCache = { at: now, value: localities };
  return localities;
}

async function loadCoverage(sql: Sql, now = Date.now()): Promise<LocalityCoverage[]> {
  if (coverageCache && now - coverageCache.at < LOCALITIES_TTL_MS) return coverageCache.value;
  const coverage = await localityCoverage(sql, DEFAULT_RADIUS_KM);
  coverageCache = { at: now, value: coverage };
  return coverage;
}

export async function loadSearch(parsed: ParsedParams): Promise<SearchOutcome> {
  try {
    const { sql } = getDb();
    if (!parsed.hasCenter) {
      const [localities, coverage] = await Promise.all([loadLocalities(sql), loadCoverage(sql)]);
      return { kind: 'no-center', localities, coverage };
    }
    const localities = await loadLocalities(sql);
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
