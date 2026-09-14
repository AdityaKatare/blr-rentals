import type { LatLng } from '@blr/core';
import type { SourceAdapter } from '../types';
import { normalizeNobroker } from './normalize';
import { parseNobrokerSearchPage } from './parse';

export const NOBROKER_BASE = 'https://www.nobroker.in';

/** `searchParam` is base64 JSON `[{lat, lon, placeId?, placeName}]`; placeId verified optional (2026-09-13). */
export function encodeSearchParam(center: LatLng, placeName: string): string {
  return Buffer.from(JSON.stringify([{ lat: center.lat, lon: center.lng, placeName }])).toString('base64');
}

/**
 * NoBroker — MVP source #1. Uses the robots-allowed SSR search page, which
 * embeds the listing objects as JSON.
 */
export const nobrokerAdapter: SourceAdapter = {
  slug: 'nobroker',
  transport: 'http',
  supports: { radiusSearch: true, maxPages: 40 },

  buildSearchUrl(area, page) {
    const overrides = area.sourceOverrides.nobroker ?? {};
    const locality = typeof overrides.locality === 'string' ? overrides.locality : area.name;
    const url = new URL(`${NOBROKER_BASE}/property/rent/bangalore/${encodeURIComponent(locality)}`);
    url.searchParams.set('searchParam', encodeSearchParam(area.center, locality));
    url.searchParams.set('radius', area.radiusKm.toFixed(1));
    url.searchParams.set('city', 'bangalore');
    url.searchParams.set('locality', locality);
    url.searchParams.set('sharedAccomodation', '0');
    // TODO(M2): confirm the SSR page honours pageNo (the JSON API does).
    if (page > 1) url.searchParams.set('pageNo', String(page));
    return url.toString();
  },

  parseSearchPage: parseNobrokerSearchPage,
  normalize: normalizeNobroker,
};
