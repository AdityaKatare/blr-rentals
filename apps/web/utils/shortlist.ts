import { isUuid } from '@blr/core';
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
