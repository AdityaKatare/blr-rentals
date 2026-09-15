export const SHORTLIST_COOKIE = 'shortlist';
export const SHORTLIST_MAX = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseShortlist(value: string | undefined): string[] {
  const ids = (value ?? '').split('.').filter((id) => UUID.test(id)).map((id) => id.toLowerCase());
  return [...new Set(ids)].slice(0, SHORTLIST_MAX);
}

export function toggleShortlist(ids: readonly string[], id: string): string[] {
  const key = id.toLowerCase();
  return ids.includes(key) ? ids.filter((x) => x !== key) : [key, ...ids].slice(0, SHORTLIST_MAX);
}

export const serializeShortlist = (ids: readonly string[]): string => ids.join('.');
