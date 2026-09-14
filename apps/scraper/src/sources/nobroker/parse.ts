import { extractInlineJson } from '../inline-json';
import { stripPii } from '../pii';
import type { ParsedPage, RawListing } from '../types';

export const NOBROKER_STATE_MARKER = /nb\.appState\s*=\s*/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const isMonthlyRental = (p: Record<string, unknown>): boolean =>
  p.forLease !== true && typeof p.rent === 'number' && p.rent > 0;

export function parseNobrokerSearchPage(body: string, _url: string): ParsedPage {
  const state = extractInlineJson(body, NOBROKER_STATE_MARKER);
  const listPage = isRecord(state) ? state.listPage : undefined;
  if (!isRecord(listPage)) throw new Error('nobroker: appState.listPage missing');

  const items = listPage.listPageProperties;
  if (!Array.isArray(items)) throw new Error('nobroker: appState.listPage.listPageProperties is not an array');

  const listings = items.filter(isRecord);
  const monthly = listings.filter(isMonthlyRental);
  const other = isRecord(listPage.listPageOtherParams) ? listPage.listPageOtherParams : {};

  return {
    raw: monthly.map((l) => stripPii(l) as RawListing),
    skipped: listings.length - monthly.length,
    hasNext: true,
    total: typeof other.total_count === 'number' ? other.total_count : undefined,
    pageSize: listings.length,
  };
}
