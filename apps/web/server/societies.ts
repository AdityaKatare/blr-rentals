import type { SortOption } from '@blr/core';
import {
  findSociety,
  listSocieties,
  societyListings,
  societyOptions,
  type SocietyListings,
  type SocietyOption,
  type SocietySummary,
} from '@blr/db';
import { getDb, reportDbError } from './db';

export const SOCIETY_OPTIONS_TTL_MS = 10 * 60 * 1000;

let optionsCache: { at: number; options: SocietyOption[] } | null = null;

export async function loadSocietyNames(now = Date.now()): Promise<SocietyOption[]> {
  if (optionsCache && now - optionsCache.at < SOCIETY_OPTIONS_TTL_MS) return optionsCache.options;
  try {
    const { sql } = getDb();
    const options = await societyOptions(sql);
    optionsCache = { at: now, options };
    return options;
  } catch {
    return [];
  }
}

export type SocietyListOutcome =
  | { kind: 'ok'; societies: SocietySummary[]; total: number }
  | { kind: 'db-error'; message: string };

export type SocietyOutcome =
  | { kind: 'ok'; page: SocietyListings }
  | { kind: 'not-found' }
  | { kind: 'db-error'; message: string };

export async function loadSocieties(q: string | undefined): Promise<SocietyListOutcome> {
  try {
    const { sql } = getDb();
    const { societies, total } = await listSocieties(sql, { q });
    return { kind: 'ok', societies, total };
  } catch (err) {
    return { kind: 'db-error', message: reportDbError(err) };
  }
}

export async function loadSociety(
  slug: string,
  options: { page: number; sort: SortOption },
): Promise<SocietyOutcome> {
  try {
    const { sql } = getDb();
    const page = await societyListings(sql, slug, options);
    if (!page) return { kind: 'not-found' };
    return { kind: 'ok', page };
  } catch (err) {
    return { kind: 'db-error', message: reportDbError(err) };
  }
}

export async function societyName(slug: string): Promise<string | null> {
  try {
    const { sql } = getDb();
    return (await findSociety(sql, slug))?.name ?? null;
  } catch {
    return null;
  }
}
