import {
  AMENITIES,
  FURNISHINGS,
  PROPERTY_TYPES,
  SOURCE_SLUGS,
  type SearchQueryInput,
} from '@blr/core';

export type Params = Record<string, string | string[] | undefined>;

export const DEFAULT_LOCALITY = 'Koramangala';
export const SORTS = ['relevance', 'rent_asc', 'distance', 'newest'] as const;

export const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
export const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

const num = (v: string | string[] | undefined): number | undefined => {
  const s = first(v);
  if (s === undefined || s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const pick = <T extends string>(values: string[], allowed: readonly T[]): T[] =>
  values.filter((v): v is T => (allowed as readonly string[]).includes(v));

export interface ParsedParams {
  localityText: string;
  explicitCenter: { lat: number; lng: number } | null;
  query: Omit<SearchQueryInput, 'center'>;
}

export function parseParams(sp: Params): ParsedParams {
  const lat = num(sp.lat);
  const lng = num(sp.lng);
  const localityText = first(sp.locality)?.trim() ?? '';
  const sort = first(sp.sort);
  const bedrooms = list(sp.bedrooms)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 10);

  const query: Omit<SearchQueryInput, 'center'> = {
    radiusKm: num(sp.radiusKm) ?? 5,
    rent: { min: num(sp.minRent), max: num(sp.maxRent) },
    bedrooms,
    parking: first(sp.parking) === 'required' ? 'required' : 'any',
    listedBy: first(sp.ownerOnly) === 'on' ? 'owner' : 'any',
    sort: SORTS.includes(sort as (typeof SORTS)[number]) ? (sort as (typeof SORTS)[number]) : 'relevance',
    page: Math.max(1, Math.trunc(num(sp.page) ?? 1)),
  };
  const furnishing = pick(list(sp.furnishing), FURNISHINGS);
  const propertyTypes = pick(list(sp.propertyTypes), PROPERTY_TYPES);
  const amenities = pick(list(sp.amenities), AMENITIES);
  const sources = pick(list(sp.sources), SOURCE_SLUGS);
  const availableBy = first(sp.availableBy);
  if (furnishing.length) query.furnishing = furnishing;
  if (propertyTypes.length) query.propertyTypes = propertyTypes;
  if (amenities.length) query.amenitiesAll = amenities;
  if (sources.length) query.sources = sources;
  if (availableBy && /^\d{4}-\d{2}-\d{2}$/.test(availableBy)) query.availableBy = availableBy;

  return {
    localityText: localityText || (lat !== undefined && lng !== undefined ? '' : DEFAULT_LOCALITY),
    explicitCenter: lat !== undefined && lng !== undefined && !localityText ? { lat, lng } : null,
    query,
  };
}

export function withParams(sp: Params, changes: Record<string, string | null>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in changes) continue;
    for (const item of list(v)) out.append(k, item);
  }
  for (const [k, v] of Object.entries(changes)) if (v !== null) out.set(k, v);
  const s = out.toString();
  return s ? `/?${s}` : '/';
}
