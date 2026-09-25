import { isUuid } from '@blr/core';
import { MAX_SEARCH_BEDROOMS } from '@/constants/search';
import { SHORTLIST_MAX } from '@/constants/shortlist';

export function parseShortlist(value: string | undefined): string[] {
  const ids = (value ?? '').split('.').filter(isUuid).map((id) => id.toLowerCase());
  return [...new Set(ids)].slice(0, SHORTLIST_MAX);
}

export function toggleShortlist(ids: readonly string[], id: string): string[] {
  const key = id.toLowerCase();
  return ids.includes(key) ? ids.filter((x) => x !== key) : [key, ...ids].slice(0, SHORTLIST_MAX);
}

export const serializeShortlist = (ids: readonly string[]): string => ids.join('.');

export function parseShortlistSize(value: string | undefined): number | null {
  if (value === undefined || !/^\d{1,2}$/.test(value)) return null;
  const bedrooms = Number(value);
  return bedrooms <= MAX_SEARCH_BEDROOMS ? bedrooms : null;
}

export const shortlistSizeHref = (bedrooms: number | null): string =>
  bedrooms === null ? '/shortlist' : `/shortlist?bedrooms=${bedrooms}`;
