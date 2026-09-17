import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRO_LINES, type MetroLine, type MetroStationStatus } from '@blr/core';
import type { SeedMetroStation } from '../seeds';

/**
 * Converts an Overpass API export (query in docs/metro-stations.md) into seeds/metro_stations.json.
 * Offline: it never touches the network.
 *
 *   pnpm --filter @blr/db build-metro-seed <overpass.json>
 */

interface OsmNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}
interface OsmRelation {
  type: 'relation';
  id: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
}
type OsmElement = OsmNode | OsmRelation;

const STOP_MATCH_RADIUS_M = 250;
const SEED_PATH = fileURLToPath(new URL('../../seeds/metro_stations.json', import.meta.url));

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cleanName = (s: string): string =>
  s
    .replace(/\s*\((u\/c|proposed)\)\s*/gi, ' ')
    .replace(/\s*metro station$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const normName = (s: string): string => slugify(cleanName(s)).replace(/-/g, '');

function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function parseDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(v);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return undefined;
}

function lineOf(value: string | undefined): MetroLine | null {
  const v = value?.toLowerCase().trim();
  return v && (METRO_LINES as readonly string[]).includes(v) ? (v as MetroLine) : null;
}

const isStation = (n: OsmNode): boolean =>
  n.tags?.railway === 'station' || n.tags?.railway === 'construction' || n.tags?.['construction:railway'] === 'station';

export function buildMetroSeed(elements: OsmElement[]): SeedMetroStation[] {
  const nodes = elements.filter((e): e is OsmNode => e.type === 'node');
  const relations = elements.filter((e): e is OsmRelation => e.type === 'relation');
  const stops = nodes.filter((n) => n.tags?.public_transport === 'stop_position');
  const stations = nodes.filter(isStation);

  const stopLines = new Map<number, Set<MetroLine>>();
  for (const r of relations) {
    const line = lineOf(r.tags?.ref) ?? lineOf(r.tags?.name?.split(' ')[0]);
    if (!line) throw new Error(`route relation ${r.id} "${r.tags?.name}" has no recognisable line`);
    for (const m of r.members ?? []) {
      if (m.type !== 'node' || m.role !== 'stop') continue;
      if (!stopLines.has(m.ref)) stopLines.set(m.ref, new Set());
      stopLines.get(m.ref)!.add(line);
    }
  }

  const merged = new Map<string, SeedMetroStation & { osm: string[] }>();
  const problems: string[] = [];

  for (const n of stations) {
    const rawName = n.tags?.name;
    if (!rawName) {
      problems.push(`node/${n.id} has no name`);
      continue;
    }
    const name = cleanName(rawName);
    const status: MetroStationStatus = n.tags?.railway === 'station' ? 'open' : 'upcoming';

    const lines = new Set<MetroLine>();
    if (status === 'open') {
      for (const s of stops) {
        const sl = stopLines.get(s.id);
        if (!sl) continue;
        if (haversineM(n, s) <= STOP_MATCH_RADIUS_M || normName(s.tags?.name ?? '') === normName(name)) {
          for (const l of sl) lines.add(l);
        }
      }
    } else {
      const l = lineOf(n.tags?.line) ?? lineOf(n.tags?.colour);
      if (l) lines.add(l);
    }
    if (lines.size === 0) {
      problems.push(`node/${n.id} "${rawName}" (${status}) matched no line`);
      continue;
    }

    const key = `${status}:${normName(name)}`;
    const existing = merged.get(key);
    if (existing) {
      existing.lines = [...new Set([...existing.lines, ...lines])];
      existing.osm.push(`node/${n.id}`);
      continue;
    }
    merged.set(key, {
      slug: slugify(name),
      name,
      lines: [...lines],
      status,
      lat: Number(n.lat.toFixed(5)),
      lng: Number(n.lon.toFixed(5)),
      openedOn: parseDate(n.tags?.opening_date ?? n.tags?.start_date),
      osm: [`node/${n.id}`],
    });
  }

  if (problems.length) throw new Error(`metro seed problems:\n  ${problems.join('\n  ')}`);

  const rows = [...merged.values()];
  const openSlugs = new Set(rows.filter((r) => r.status === 'open').map((r) => r.slug));
  for (const r of rows) {
    if (r.status === 'upcoming' && openSlugs.has(r.slug)) r.slug = `${r.slug}-upcoming`;
  }
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.slug)) throw new Error(`duplicate slug ${r.slug}`);
    seen.add(r.slug);
  }

  const order = (l: MetroLine) => METRO_LINES.indexOf(l);
  return rows
    .sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name))
    .map(({ osm, openedOn, ...r }) => ({
      ...r,
      lines: [...r.lines].sort((a, b) => order(a) - order(b)),
      ...(openedOn ? { openedOn } : {}),
      refs: { osm: osm.join(',') },
    }));
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: build-metro-seed <overpass.json>');
    process.exit(2);
  }
  readFile(input, 'utf8')
    .then((text) => buildMetroSeed((JSON.parse(text) as { elements: OsmElement[] }).elements))
    .then(async (rows) => {
      await writeFile(SEED_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
      const open = rows.filter((r) => r.status === 'open').length;
      console.log(`wrote ${rows.length} stations (${open} open, ${rows.length - open} upcoming) to ${SEED_PATH}`);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    });
}
