import type { LatLng } from '@blr/core';
import type { SourceAdapter } from '../types';
import { normalizeNobroker } from './normalize';
import { parseNobrokerSearchPage } from './parse';

export const NOBROKER_BASE = 'https://www.nobroker.in';

export function encodeSearchParam(center: LatLng, placeName: string): string {
  return Buffer.from(JSON.stringify([{ lat: center.lat, lon: center.lng, placeName }])).toString('base64');
}

export const NOBROKER_SLICES = ['RK1', 'BHK1', 'BHK2', 'BHK3', 'BHK4', 'BHK4PLUS'] as const;

export const nobrokerAdapter: SourceAdapter = {
  slug: 'nobroker',
  transport: 'http',
  supports: { radiusSearch: true, maxPages: 1 },
  slices: NOBROKER_SLICES,

  buildSearchUrl(area, page, slice) {
    if (page !== 1) throw new RangeError(`nobroker search pages ignore pageNo; got page ${page}`);
    if (!(NOBROKER_SLICES as readonly string[]).includes(slice)) throw new RangeError(`unknown nobroker slice "${slice}"`);
    const overrides = area.sourceOverrides.nobroker ?? {};
    const locality = typeof overrides.locality === 'string' ? overrides.locality : area.name;
    const url = new URL(`${NOBROKER_BASE}/property/rent/bangalore/${encodeURIComponent(locality)}`);
    url.searchParams.set('searchParam', encodeSearchParam(area.center, locality));
    url.searchParams.set('radius', area.radiusKm.toFixed(1));
    url.searchParams.set('city', 'bangalore');
    url.searchParams.set('locality', locality);
    url.searchParams.set('sharedAccomodation', '0');
    url.searchParams.set('type', slice);
    url.searchParams.set('orderBy', 'lastUpdateDate,desc');
    return url.toString();
  },

  parseSearchPage: parseNobrokerSearchPage,
  normalize: normalizeNobroker,
};
