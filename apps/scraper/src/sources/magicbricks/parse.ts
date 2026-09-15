import { extractInlineJson } from '../inline-json';
import { stripPii } from '../pii';
import type { ParsedPage, RawListing } from '../types';

export const MAGICBRICKS_STATE_MARKER = /window\.SERVER_PRELOADED_STATE_\s*=\s*/;

export const RESIDENTIAL_TYPE_CODES = new Set(['10001', '10002', '10003', '10017', '10021', '10022']);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const toInt = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};

const isResidentialRental = (p: Record<string, unknown>): boolean =>
  (p.transType === undefined || p.transType === 'Rent') &&
  RESIDENTIAL_TYPE_CODES.has(String(p.ty)) &&
  typeof p.price === 'number' &&
  p.price > 0;

export function parseMagicbricksSearchPage(body: string, url: string): ParsedPage {
  const state = extractInlineJson(body, MAGICBRICKS_STATE_MARKER);
  if (!isRecord(state)) throw new Error('magicbricks: preloaded state is not an object');

  const items = state.searchResult;
  if (!Array.isArray(items)) throw new Error('magicbricks: searchResult is not an array');

  const extra = isRecord(state.searchAdditionalDataBean) ? state.searchAdditionalDataBean : {};
  const form = isRecord(extra.searchForm) ? extra.searchForm : {};
  if (typeof form.localityName !== 'string' || form.localityName.trim() === '') {
    return { raw: [], skipped: 0, hasNext: false, pageSize: 0 };
  }

  const requestedPage = Number(/\/page-(\d+)(?:[/?#]|$)/.exec(new URL(url).pathname)?.[1] ?? 1);
  const searchBean = isRecord(state.searchBean) ? state.searchBean : {};
  const pageNo = toInt(searchBean.pageNo) ?? toInt(form.page) ?? requestedPage;
  if (pageNo !== requestedPage) {
    throw new Error(`magicbricks: asked for page ${requestedPage} but the page reports ${pageNo}`);
  }

  const listings = items.filter(isRecord);
  const rentals = listings.filter(isResidentialRental);
  const pageCount = toInt(extra.pageCount);

  return {
    raw: rentals.map((l) => stripPii(l) as RawListing),
    skipped: listings.length - rentals.length,
    hasNext: pageCount !== null ? pageNo < pageCount : listings.length > 0,
    total: toInt(extra.resultCount) ?? undefined,
    pageSize: listings.length,
  };
}
