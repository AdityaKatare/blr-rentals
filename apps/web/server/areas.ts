import { AREA_MIN_LISTINGS, type SortOption } from '@blr/core';
import { areaListings, type AreaListings } from '@blr/db';
import { cache } from 'react';
import { getDb, reportDbError } from './db';
import { loadCoverage, loadLocalities } from './search';

export type AreaOutcome =
  | { kind: 'ok'; page: AreaListings; neighbours: AreaListings['neighbours'] }
  | { kind: 'not-found' }
  | { kind: 'db-error'; message: string };

export const AREA_NEIGHBOURS_SHOWN = 6;

const listedAreas = async (): Promise<Map<number, number>> => {
  const { sql } = getDb();
  const coverage = await loadCoverage(sql);
  return new Map(coverage.filter((c) => c.listings >= AREA_MIN_LISTINGS).map((c) => [c.id, c.listings]));
};

export const loadArea = cache(async (slug: string, page: number, sort: SortOption): Promise<AreaOutcome> => {
  try {
    const { sql } = getDb();
    const [result, listed] = await Promise.all([areaListings(sql, slug, { page, sort }), listedAreas()]);
    if (!result) return { kind: 'not-found' };
    const neighbours = result.neighbours.filter((n) => listed.has(n.id)).slice(0, AREA_NEIGHBOURS_SHOWN);
    return { kind: 'ok', page: result, neighbours };
  } catch (err) {
    return { kind: 'db-error', message: reportDbError(err) };
  }
});

export async function loadAreaSlugs(): Promise<string[]> {
  try {
    const { sql } = getDb();
    const [localities, listed] = await Promise.all([loadLocalities(sql), listedAreas()]);
    return localities.filter((l) => listed.has(l.id)).map((l) => l.slug);
  } catch {
    return [];
  }
}
