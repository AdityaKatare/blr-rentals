import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRO_LINES, METRO_STATION_STATUSES, type MetroLine, type MetroStationStatus, type SourceSlug } from '@blr/core';
import type { ResolvedSearchArea } from './types';

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

export interface SeedMetroStation {
  slug: string;
  name: string;
  lines: MetroLine[];
  status: MetroStationStatus;
  lat: number;
  lng: number;
  openedOn?: string;
  refs?: Record<string, string>;
}

export interface SeedSearchArea {
  slug: string;
  name: string;
  locality: string;
  radiusKm: number;
  enabled?: boolean;
  sourceOverrides?: Record<string, Record<string, unknown>>;
}


const seedsDir = (): string => path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seeds');

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(seedsDir(), file), 'utf8')) as T;
}

export const loadSeedSources = (): Promise<SeedSource[]> => loadJson('sources.json');
export const loadSeedLocalities = (): Promise<SeedLocality[]> => loadJson('localities.json');
export const loadSeedSearchAreas = (): Promise<SeedSearchArea[]> => loadJson('search_areas.json');

export async function loadSeedMetroStations(): Promise<SeedMetroStation[]> {
  const rows = await loadJson<SeedMetroStation[]>('metro_stations.json');
  for (const r of rows) {
    const badLine = r.lines.find((l) => !(METRO_LINES as readonly string[]).includes(l));
    if (r.lines.length === 0 || badLine) throw new Error(`metro station "${r.slug}" has invalid lines: ${r.lines.join(',')}`);
    if (!(METRO_STATION_STATUSES as readonly string[]).includes(r.status)) {
      throw new Error(`metro station "${r.slug}" has invalid status: ${r.status}`);
    }
  }
  return rows;
}

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
