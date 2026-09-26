import type { PoiCategory } from '@blr/core';

export type OsmType = 'node' | 'way' | 'relation';

export interface TagMatch {
  key: string;
  value?: string | RegExp;
}

export interface OsmRule {
  category: Exclude<PoiCategory, 'metro'>;
  types: readonly OsmType[];
  all: readonly TagMatch[];
  none?: readonly TagMatch[];
  lines?: boolean;
  minAreaM2?: number;
  mergeByNameWithinM?: number;
}

export interface PoiOverrides {
  extraNamePatterns?: Partial<Record<PoiCategory, string[]>>;
  exclude?: string[];
  rename?: Record<string, string>;
}

export interface OsmElement {
  type: OsmType;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number } | null>;
  tags?: Record<string, string>;
}

export type Geometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'GeometryCollection'; geometries: Geometry[] };

export interface PoiRow {
  category: OsmRule['category'];
  name: string | null;
  sourceRef: string;
  geometry: Geometry;
  tags: Record<string, string>;
}

const TECH_PARK_NAMES = [
  'tech ?park',
  'it ?park',
  'software (technology )?park',
  'business ?park',
  'tech ?village',
  'tech ?city',
  'cyber ?city',
  'info ?park',
  'knowledge ?park',
  'special economic zone',
  '(^|[^a-z])sez([^a-z]|$)',
];

const NWR: readonly OsmType[] = ['node', 'way', 'relation'];
const KEPT_TAGS = ['name', 'brand', 'operator', 'iata', 'ref', 'official_name'];

export function osmRules(overrides: PoiOverrides = {}): OsmRule[] {
  const extraTech = overrides.extraNamePatterns?.tech_park ?? [];
  const techName: TagMatch = { key: 'name', value: new RegExp([...TECH_PARK_NAMES, ...extraTech].join('|'), 'i') };
  const tech = (key: string, value?: RegExp): OsmRule => ({
    category: 'tech_park',
    types: NWR,
    all: [{ key, value }, techName],
    minAreaM2: 5000,
    mergeByNameWithinM: 2000,
  });
  return [
    tech('landuse', /^(commercial|industrial|retail)$/),
    tech('office'),
    tech('building'),
    {
      category: 'railway_station',
      types: ['node', 'way'],
      all: [{ key: 'railway', value: 'station' }],
      none: [{ key: 'station', value: /^(subway|light_rail|monorail)$/ }],
      mergeByNameWithinM: 500,
    },
    { category: 'bus_stop', types: ['node'], all: [{ key: 'highway', value: 'bus_stop' }] },
    { category: 'bus_stop', types: NWR, all: [{ key: 'amenity', value: 'bus_station' }] },
    { category: 'airport', types: NWR, all: [{ key: 'aeroway', value: 'aerodrome' }, { key: 'iata' }] },
    { category: 'major_road', types: ['way'], all: [{ key: 'highway', value: /^(motorway|trunk|primary)$/ }], lines: true },
    { category: 'school', types: NWR, all: [{ key: 'amenity', value: 'school' }] },
    { category: 'college', types: NWR, all: [{ key: 'amenity', value: /^(college|university)$/ }] },
    { category: 'hospital', types: NWR, all: [{ key: 'amenity', value: 'hospital' }] },
    { category: 'hospital', types: NWR, all: [{ key: 'healthcare', value: 'hospital' }], none: [{ key: 'amenity' }] },
    { category: 'mall', types: NWR, all: [{ key: 'shop', value: 'mall' }] },
    { category: 'supermarket', types: NWR, all: [{ key: 'shop', value: 'supermarket' }] },
    { category: 'restaurant', types: NWR, all: [{ key: 'amenity', value: /^(restaurant|cafe)$/ }] },
    { category: 'gym', types: NWR, all: [{ key: 'leisure', value: 'fitness_centre' }] },
    { category: 'park', types: NWR, all: [{ key: 'leisure', value: 'park' }], minAreaM2: 1000 },
  ];
}

function qlFilter(m: TagMatch, negate: boolean): string {
  if (m.value === undefined) return negate ? `[!"${m.key}"]` : `["${m.key}"]`;
  if (typeof m.value === 'string') return `["${m.key}"${negate ? '!=' : '='}"${m.value}"]`;
  const flags = m.value.flags.includes('i') ? ',i' : '';
  return `["${m.key}"${negate ? '!~' : '~'}"${m.value.source.replace(/\\/g, '\\\\')}"${flags}]`;
}

export function overpassQuery(rules: readonly OsmRule[], bbox: readonly [number, number, number, number]): string {
  const box = `(${bbox.join(',')})`;
  const byType = (type: OsmType) =>
    rules
      .filter((r) => r.types.includes(type))
      .map((r) => `  ${type}${[...r.all.map((m) => qlFilter(m, false)), ...(r.none ?? []).map((m) => qlFilter(m, true))].join('')}${box};`)
      .join('\n');
  return [
    '[out:json][timeout:600][maxsize:1073741824];',
    `(\n${byType('node')}\n)->.n;`,
    `(\n${byType('way')}\n)->.w;`,
    `(\n${byType('relation')}\n)->.r;`,
    '.n out body;',
    '.w out geom;',
    '.r out tags center;',
    '',
  ].join('\n');
}

const matches = (tags: Record<string, string>, m: TagMatch): boolean => {
  const v = tags[m.key];
  if (v === undefined) return false;
  if (m.value === undefined) return true;
  return typeof m.value === 'string' ? v === m.value : m.value.test(v);
};

export const ruleMatches = (rule: OsmRule, el: OsmElement): boolean => {
  const tags = el.tags ?? {};
  return (
    rule.types.includes(el.type) &&
    rule.all.every((m) => matches(tags, m)) &&
    !(rule.none ?? []).some((m) => matches(tags, m))
  );
};

const EARTH_M = 6371008.8;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

export function ringAreaM2(ring: readonly [number, number][]): number {
  if (ring.length < 4) return 0;
  const lat0 = toRad(ring.reduce((s, p) => s + p[1], 0) / ring.length);
  let twice = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    twice += toRad(x1) * Math.cos(lat0) * toRad(y2) - toRad(x2) * Math.cos(lat0) * toRad(y1);
  }
  return Math.abs(twice / 2) * EARTH_M * EARTH_M;
}

export function anchor(g: Geometry): [number, number] {
  if (g.type === 'Point') return g.coordinates;
  if (g.type === 'GeometryCollection') return anchor(g.geometries[0]!);
  const pts = g.type === 'LineString' ? g.coordinates : g.coordinates[0]!;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

function toGeometry(el: OsmElement, rule: OsmRule): Geometry | null {
  if (el.type === 'node') return el.lat === undefined || el.lon === undefined ? null : { type: 'Point', coordinates: [el.lon, el.lat] };
  if (el.type === 'relation') return el.center ? { type: 'Point', coordinates: [el.center.lon, el.center.lat] } : null;
  const pts = (el.geometry ?? []).filter((p): p is { lat: number; lon: number } => p !== null).map((p) => [p.lon, p.lat] as [number, number]);
  if (pts.length < 2) return null;
  if (rule.lines) return { type: 'LineString', coordinates: pts };
  const [first, last] = [pts[0]!, pts[pts.length - 1]!];
  const closed = pts.length >= 4 && first[0] === last[0] && first[1] === last[1];
  if (closed) {
    if (rule.minAreaM2 !== undefined && ringAreaM2(pts) < rule.minAreaM2) return null;
    return { type: 'Polygon', coordinates: [pts] };
  }
  return { type: 'Point', coordinates: anchor({ type: 'LineString', coordinates: pts }) };
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function mergeByName(rows: PoiRow[], withinM: number): PoiRow[] {
  const out: PoiRow[] = [];
  for (const row of rows) {
    const key = row.name ? normName(row.name) : null;
    const twin = key
      ? out.find((o) => o.name && normName(o.name) === key && haversineM(anchor(o.geometry), anchor(row.geometry)) <= withinM)
      : undefined;
    if (!twin) {
      out.push(row);
      continue;
    }
    const parts = twin.geometry.type === 'GeometryCollection' ? twin.geometry.geometries : [twin.geometry];
    twin.geometry = { type: 'GeometryCollection', geometries: [...parts, row.geometry] };
    twin.sourceRef = `${twin.sourceRef},${row.sourceRef}`;
  }
  return out;
}

export function buildPoiRows(elements: readonly OsmElement[], overrides: PoiOverrides = {}): PoiRow[] {
  const rules = osmRules(overrides);
  const excluded = new Set(overrides.exclude ?? []);
  const seen = new Set<string>();
  const byCategory = new Map<OsmRule['category'], PoiRow[]>();
  const mergeRadius = new Map<OsmRule['category'], number>();

  for (const el of elements) {
    const ref = `${el.type}/${el.id}`;
    if (excluded.has(ref)) continue;
    for (const rule of rules) {
      if (!ruleMatches(rule, el)) continue;
      const key = `${rule.category}:${ref}`;
      if (seen.has(key)) continue;
      const geometry = toGeometry(el, rule);
      if (!geometry) continue;
      seen.add(key);
      const tags = Object.fromEntries(KEPT_TAGS.filter((k) => el.tags?.[k] !== undefined).map((k) => [k, el.tags![k]!]));
      const name = overrides.rename?.[ref] ?? el.tags?.name?.trim() ?? null;
      const list = byCategory.get(rule.category) ?? [];
      list.push({ category: rule.category, name: name || null, sourceRef: ref, geometry, tags });
      byCategory.set(rule.category, list);
      if (rule.mergeByNameWithinM) mergeRadius.set(rule.category, rule.mergeByNameWithinM);
    }
  }

  return [...byCategory.entries()].flatMap(([category, rows]) => {
    const radius = mergeRadius.get(category);
    return radius ? mergeByName(rows, radius) : rows;
  });
}
