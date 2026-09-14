import { NotImplementedError } from '../../errors';
import type { SourceAdapter } from '../types';

export const NINETYNINEACRES_BASE = 'https://www.99acres.com';

/**
 * 99acres — deferred, disabled in seeds.
 *
 * If it is ever enabled: SEO pages `/flats-for-rent-in-<locality>-bangalore-<zone>-ffid[-page-N]`
 * are robots-allowed and embed window.__initialData__.srp.pageData.properties (26/page).
 */
export const ninetynineacresAdapter: SourceAdapter = {
  slug: 'ninetynineacres',
  transport: 'browser',
  supports: { radiusSearch: false, maxPages: 20 },

  buildSearchUrl(area, page) {
    const overrides = area.sourceOverrides.ninetynineacres ?? {};
    const path = typeof overrides.path === 'string' ? overrides.path : null;
    if (!path) {
      throw new NotImplementedError(
        `ninetynineacres.buildSearchUrl for area "${area.slug}" (needs source_overrides.ninetynineacres.path, e.g. /flats-for-rent-in-koramangala-bangalore-south-ffid)`,
        'gated: written consent',
      );
    }
    return `${NINETYNINEACRES_BASE}${path}${page > 1 ? `-page-${page}` : ''}`;
  },

  parseSearchPage() {
    throw new NotImplementedError('ninetynineacres.parseSearchPage', 'gated: written consent');
  },

  normalize() {
    throw new NotImplementedError('ninetynineacres.normalize', 'gated: written consent');
  },
};
