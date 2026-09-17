import { FURNISHING_LABELS, NEAR_METRO_LABELS, PROPERTY_TYPE_LABELS, SOURCE_LABELS } from '@/constants/labels';
import { BHK_OPTIONS, FILTERS_KEPT_ON_CLEAR } from '@/constants/search';
import { humanize, rupees, shortDate } from './format';
import { first, isNearMetroOption, list, withParams, type Params } from './search-params';

export interface ActiveFilter {
  key: string;
  label: string;
  href: string;
}

function withoutValue(params: Params, key: string, value: string): string {
  const rest = list(params[key]).filter((v) => v !== value);
  const next: Params = { ...params, [key]: rest.length ? rest : undefined };
  return withParams(next, { page: null });
}

export function activeFilters(params: Params): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const multi = (key: string, label: (v: string) => string) => {
    for (const v of list(params[key])) chips.push({ key: `${key}:${v}`, label: label(v), href: withoutValue(params, key, v) });
  };

  multi('bedrooms', (v) => BHK_OPTIONS.find((o) => o.value === v)?.label ?? `${v} BHK`);

  const min = Number(first(params.minRent));
  const max = Number(first(params.maxRent));
  const hasMin = first(params.minRent) !== undefined && first(params.minRent) !== '' && Number.isFinite(min);
  const hasMax = first(params.maxRent) !== undefined && first(params.maxRent) !== '' && Number.isFinite(max);
  if (hasMin || hasMax) {
    const label = hasMin && hasMax ? `${rupees(min)} – ${rupees(max)}` : hasMin ? `From ${rupees(min)}` : `Up to ${rupees(max)}`;
    chips.push({ key: 'rent', label, href: withParams(params, { minRent: null, maxRent: null, page: null }) });
  }

  multi('furnishing', (v) => FURNISHING_LABELS[v] || humanize(v));
  multi('propertyTypes', (v) => PROPERTY_TYPE_LABELS[v] ?? humanize(v));
  if (first(params.parking) === 'required') {
    chips.push({ key: 'parking', label: 'Has parking', href: withParams(params, { parking: null, page: null }) });
  }
  if (first(params.ownerOnly) === 'on') {
    chips.push({ key: 'ownerOnly', label: 'Owner only', href: withParams(params, { ownerOnly: null, page: null }) });
  }
  const availableBy = first(params.availableBy);
  if (availableBy) {
    const label = `Available by ${shortDate(availableBy) ?? availableBy}`;
    chips.push({ key: 'availableBy', label, href: withParams(params, { availableBy: null, page: null }) });
  }
  const nearMetro = Number(first(params.nearMetro));
  if (isNearMetroOption(nearMetro)) {
    chips.push({
      key: 'nearMetro',
      label: `Metro within ${NEAR_METRO_LABELS[nearMetro]}`,
      href: withParams(params, { nearMetro: null, page: null }),
    });
  }
  multi('amenities', (v) => humanize(v));
  multi('sources', (v) => SOURCE_LABELS[v] ?? v);

  return chips;
}

export function clearFiltersHref(params: Params): string {
  const kept: Params = {};
  for (const key of FILTERS_KEPT_ON_CLEAR) if (params[key] !== undefined) kept[key] = params[key];
  return withParams(kept, {});
}
