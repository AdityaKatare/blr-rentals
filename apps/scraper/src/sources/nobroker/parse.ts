import { isRecord } from '../shared/coerce';
import { extractInlineJson } from '../shared/inline-json';
import { nextFlightPayload } from '../shared/next-flight';
import { stripPii } from '../shared/pii';
import type { ParsedPage, RawListing } from '../types';

export const NOBROKER_STATE_MARKER = /nb\.appState\s*=\s*/;
export const NOBROKER_NEXT_LISTINGS_MARKER = '"initialProperties":';
const NOBROKER_NEXT_RESULTS_MARKER = '"listPageProperties":';

const isMonthlyRental = (p: Record<string, unknown>): boolean =>
  p.forLease !== true && typeof p.rent === 'number' && p.rent > 0;

export function parseNobrokerSearchPage(body: string, _url: string): ParsedPage {
  if (NOBROKER_STATE_MARKER.test(body)) return parseAppStatePage(body);
  const flight = nextFlightPayload(body);
  if (flight.includes(NOBROKER_NEXT_LISTINGS_MARKER)) return parseNextPage(flight);
  throw new Error('nobroker: page has neither nb.appState nor Next.js initialProperties');
}

function parseAppStatePage(body: string): ParsedPage {
  const state = extractInlineJson(body, NOBROKER_STATE_MARKER);
  const listPage = isRecord(state) ? state.listPage : undefined;
  if (!isRecord(listPage)) throw new Error('nobroker: appState.listPage missing');

  const items = listPage.listPageProperties;
  if (!Array.isArray(items)) throw new Error('nobroker: appState.listPage.listPageProperties is not an array');

  const other = isRecord(listPage.listPageOtherParams) ? listPage.listPageOtherParams : {};
  return toParsedPage(items, other.total_count);
}

function parseNextPage(flight: string): ParsedPage {
  const items = extractInlineJson(flight, NOBROKER_NEXT_LISTINGS_MARKER);
  if (!Array.isArray(items)) throw new Error('nobroker: initialProperties is not an array');

  const results = flight.includes(NOBROKER_NEXT_RESULTS_MARKER) ? extractInlineJson(flight, NOBROKER_NEXT_RESULTS_MARKER) : {};
  const other = isRecord(results) && isRecord(results.otherParams) ? results.otherParams : {};
  return toParsedPage(items, other.total_count);
}

function toParsedPage(items: unknown[], total: unknown): ParsedPage {
  const listings = items.filter(isRecord);
  const monthly = listings.filter(isMonthlyRental);
  return {
    raw: monthly.map((l) => stripPii(l) as RawListing),
    skipped: listings.length - monthly.length,
    hasNext: true,
    total: typeof total === 'number' ? total : undefined,
    pageSize: listings.length,
  };
}
