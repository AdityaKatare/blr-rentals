import type { SourceAdapter } from '../types';
import { normalizeMagicbricks } from './normalize';
import { parseMagicbricksSearchPage } from './parse';

export const MAGICBRICKS_BASE = 'https://www.magicbricks.com';

export const magicbricksAdapter: SourceAdapter = {
  slug: 'magicbricks',
  transport: 'http',
  supports: { radiusSearch: false, maxPages: 30 },

  buildSearchUrl(area, page) {
    const overrides = area.sourceOverrides.magicbricks ?? {};
    const locality = typeof overrides.locality === 'string' ? overrides.locality : area.name;
    const url = new URL(`${MAGICBRICKS_BASE}/property-for-rent/residential-real-estate`);
    url.searchParams.set('cityName', 'Bangalore');
    url.searchParams.set('Locality', locality);
    if (page > 1) url.searchParams.set('page', String(page));
    return url.toString();
  },

  parseSearchPage: parseMagicbricksSearchPage,
  normalize: normalizeMagicbricks,
};
