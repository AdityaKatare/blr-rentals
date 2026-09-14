import { NotImplementedError } from '../../errors';
import type { SourceAdapter } from '../types';

export const HOUSING_BASE = 'https://housing.com';

/**
 * Housing.com — Phase 2, disabled in seeds. Planned `transport: 'browser'`
 * (Playwright helper in src/browser/, not written yet).
 *
 * Locality pages carry an opaque id (…-P5s2sntlyr4a7izpb) that must be
 * discovered from the city page and stored in search_areas.source_overrides.housing.path.
 */
export const housingAdapter: SourceAdapter = {
  slug: 'housing',
  transport: 'browser',
  supports: { radiusSearch: false, maxPages: 20 },

  buildSearchUrl(area, page) {
    const overrides = area.sourceOverrides.housing ?? {};
    const path = typeof overrides.path === 'string' ? overrides.path : null;
    if (!path) {
      throw new NotImplementedError(
        `housing.buildSearchUrl for area "${area.slug}" (needs source_overrides.housing.path, e.g. /rent/flats-for-rent-in-koramangala-bengaluru-P5s2sntlyr4a7izpb)`,
        'Phase 2',
      );
    }
    const url = new URL(path, HOUSING_BASE);
    if (page > 1) url.searchParams.set('page', String(page));
    return url.toString();
  },

  parseSearchPage() {
    // window.__INITIAL_STATE__.searchResults.data{<id>: listing} (30 per page)
    throw new NotImplementedError('housing.parseSearchPage', 'Phase 2');
  },

  normalize() {
    throw new NotImplementedError('housing.normalize', 'Phase 2');
  },
};
