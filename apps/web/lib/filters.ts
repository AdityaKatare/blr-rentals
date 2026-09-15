import { rupees, FURNISHING_LABELS, humanize, PROPERTY_TYPE_LABELS, SOURCE_LABELS } from './format';
import { first, list, withParams, type Params } from './search-params';

export const BHK_OPTIONS = [
  { value: '0', label: '1 RK' },
  { value: '1', label: '1 BHK' },
  { value: '2', label: '2 BHK' },
  { value: '3', label: '3 BHK' },
  { value: '4', label: '4+ BHK' },
];

export interface ActiveFilter {
  key: string;
  label: string;
  href: string;
}

const KEPT_ON_CLEAR = ['locality', 'lat', 'lng', 'radiusKm', 'sort'];

export function withoutValue(sp: Params, key: string, value: string): string {
  const rest = list(sp[key]).filter((v) => v !== value);
  const next: Params = { ...sp, [key]: rest.length ? rest : undefined };
  return withParams(next, { page: null });
}

export function activeFilters(sp: Params): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const multi = (key: string, label: (v: string) => string) => {
    for (const v of list(sp[key])) chips.push({ key: `${key}:${v}`, label: label(v), href: withoutValue(sp, key, v) });
  };

  multi('bedrooms', (v) => BHK_OPTIONS.find((o) => o.value === v)?.label ?? `${v} BHK`);

  const min = Number(first(sp.minRent));
  const max = Number(first(sp.maxRent));
  const hasMin = first(sp.minRent) !== undefined && first(sp.minRent) !== '' && Number.isFinite(min);
  const hasMax = first(sp.maxRent) !== undefined && first(sp.maxRent) !== '' && Number.isFinite(max);
  if (hasMin || hasMax) {
    const label = hasMin && hasMax ? `${rupees(min)} – ${rupees(max)}` : hasMin ? `From ${rupees(min)}` : `Up to ${rupees(max)}`;
    chips.push({ key: 'rent', label, href: withParams(sp, { minRent: null, maxRent: null, page: null }) });
  }

  multi('furnishing', (v) => FURNISHING_LABELS[v] || humanize(v));
  multi('propertyTypes', (v) => PROPERTY_TYPE_LABELS[v] ?? humanize(v));
  if (first(sp.parking) === 'required') chips.push({ key: 'parking', label: 'Has parking', href: withParams(sp, { parking: null, page: null }) });
  if (first(sp.ownerOnly) === 'on') chips.push({ key: 'ownerOnly', label: 'Owner only', href: withParams(sp, { ownerOnly: null, page: null }) });
  const availableBy = first(sp.availableBy);
  if (availableBy) {
    const date = new Date(`${availableBy}T00:00:00+05:30`);
    const label = Number.isNaN(date.getTime())
      ? availableBy
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    chips.push({ key: 'availableBy', label: `Available by ${label}`, href: withParams(sp, { availableBy: null, page: null }) });
  }
  multi('amenities', (v) => humanize(v));
  multi('sources', (v) => SOURCE_LABELS[v] ?? v);

  return chips;
}

export function clearFiltersHref(sp: Params): string {
  const kept: Params = {};
  for (const key of KEPT_ON_CLEAR) if (sp[key] !== undefined) kept[key] = sp[key];
  return withParams(kept, {});
}
