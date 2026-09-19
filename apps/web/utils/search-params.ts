import {
  AMENITIES,
  DEFAULT_RADIUS_KM,
  DEPOSIT_MONTHS_OPTIONS,
  FURNISHINGS,
  NEAR_METRO_OPTIONS_M,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  SOURCE_SLUGS,
  TENANT_FILTERS,
  type DepositMonths,
  type NearMetroM,
  type SearchQueryInput,
  type TenantFilter,
} from '@blr/core';
import { LARGEST_BHK_OPTION, MAX_SEARCH_BEDROOMS } from '@/constants/search';

export type Params = Record<string, string | string[] | undefined>;

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
  hasCenter: boolean;
  query: Omit<SearchQueryInput, 'center'>;
}

export function parseParams(params: Params): ParsedParams {
  const lat = num(params.lat);
  const lng = num(params.lng);
  const localityText = first(params.locality)?.trim() ?? '';
  const bedrooms = list(params.bedrooms)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= MAX_SEARCH_BEDROOMS);

  const query: Omit<SearchQueryInput, 'center'> = {
    radiusKm: num(params.radiusKm) ?? DEFAULT_RADIUS_KM,
    rent: { min: num(params.minRent), max: num(params.maxRent) },
    bedrooms,
    parking: first(params.parking) === 'required' ? 'required' : 'any',
    listedBy: first(params.ownerOnly) === 'on' ? 'owner' : 'any',
    sort: SORT_OPTIONS.find((s) => s === first(params.sort)) ?? 'relevance',
    page: Math.max(1, Math.trunc(num(params.page) ?? 1)),
  };
  const furnishing = pick(list(params.furnishing), FURNISHINGS);
  const propertyTypes = pick(list(params.propertyTypes), PROPERTY_TYPES);
  const amenities = pick(list(params.amenities), AMENITIES);
  const sources = pick(list(params.sources), SOURCE_SLUGS);
  const availableBy = first(params.availableBy);
  if (furnishing.length) query.furnishing = furnishing;
  if (propertyTypes.length) query.propertyTypes = propertyTypes;
  if (amenities.length) query.amenitiesAll = amenities;
  if (sources.length) query.sources = sources;
  if (availableBy && /^\d{4}-\d{2}-\d{2}$/.test(availableBy)) query.availableBy = availableBy;
  const nearMetro = num(params.nearMetro);
  if (nearMetro !== undefined && isNearMetroOption(nearMetro)) query.nearMetroM = nearMetro;
  const tenants = first(params.tenants);
  if (tenants !== undefined && isTenantFilter(tenants)) query.tenantPreference = tenants;
  const depositMonths = num(params.depositMonths);
  if (depositMonths !== undefined && isDepositMonths(depositMonths)) query.depositMaxMonths = depositMonths;

  const explicitCenter = lat !== undefined && lng !== undefined && !localityText ? { lat, lng } : null;

  return {
    localityText,
    explicitCenter,
    hasCenter: explicitCenter !== null || localityText !== '',
    query,
  };
}

export const isNearMetroOption = (n: number): n is NearMetroM => (NEAR_METRO_OPTIONS_M as readonly number[]).includes(n);

export const isTenantFilter = (v: string): v is TenantFilter => (TENANT_FILTERS as readonly string[]).includes(v);

export const isDepositMonths = (n: number): n is DepositMonths =>
  (DEPOSIT_MONTHS_OPTIONS as readonly number[]).includes(n);

export function withLargerHomes(bedrooms: readonly number[]): number[] {
  if (!bedrooms.includes(LARGEST_BHK_OPTION)) return [...bedrooms];
  const larger = Array.from({ length: MAX_SEARCH_BEDROOMS - LARGEST_BHK_OPTION }, (_, i) => LARGEST_BHK_OPTION + 1 + i);
  return [...new Set([...bedrooms, ...larger])];
}

export function withParams(params: Params, changes: Record<string, string | null>, basePath = '/'): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k in changes) continue;
    for (const item of list(v)) out.append(k, item);
  }
  for (const [k, v] of Object.entries(changes)) if (v !== null) out.set(k, v);
  const s = out.toString();
  return s ? `${basePath}?${s}` : basePath;
}
