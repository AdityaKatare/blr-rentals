import { readFile } from 'node:fs/promises';
import type { LatLng, SourceSlug } from '@blr/core';

export interface SeedSource {
  slug: SourceSlug;
  name: string;
  baseUrl: string;
  enabled: boolean;
  transport: 'http' | 'browser';
  crawlIntervalMin: number;
  minDelayMs: number;
  notes?: string;
}

export interface SeedLocality {
  slug: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  accuracy?: 'exact' | 'approximate';
}

export interface SeedSearchArea {
  slug: string;
  name: string;
  /** slug of a seed locality */
  locality: string;
  radiusKm: number;
  enabled?: boolean;
  sourceOverrides?: Record<string, Record<string, unknown>>;
}

/** Runtime shape the scraper needs; identical whether resolved from seeds or from the DB. */
export interface ResolvedSearchArea {
  id: number | null;
  slug: string;
  name: string;
  center: LatLng;
  radiusKm: number;
  sourceOverrides: Record<string, Record<string, unknown>>;
}

const SEEDS_DIR = new URL('../seeds/', import.meta.url);

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(new URL(file, SEEDS_DIR), 'utf8')) as T;
}

export const loadSeedSources = (): Promise<SeedSource[]> => loadJson('sources.json');
export const loadSeedLocalities = (): Promise<SeedLocality[]> => loadJson('localities.json');
export const loadSeedSearchAreas = (): Promise<SeedSearchArea[]> => loadJson('search_areas.json');

/** Resolve a search area from the seed files only (no database) — used by `scrape --dry-run`. */
export async function resolveSeedArea(slug: string): Promise<ResolvedSearchArea | null> {
  const [areas, localities] = await Promise.all([loadSeedSearchAreas(), loadSeedLocalities()]);
  const area = areas.find((a) => a.slug === slug);
  if (!area) return null;
  const locality = localities.find((l) => l.slug === area.locality);
  if (!locality) throw new Error(`search area "${slug}" references unknown locality "${area.locality}"`);
  return {
    id: null,
    slug: area.slug,
    name: area.name,
    center: { lat: locality.lat, lng: locality.lng },
    radiusKm: area.radiusKm,
    sourceOverrides: area.sourceOverrides ?? {},
  };
}
