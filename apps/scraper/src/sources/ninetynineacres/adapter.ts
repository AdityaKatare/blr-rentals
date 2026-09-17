import { NotImplementedError } from '../../errors';
import type { SourceAdapter } from '../types';

export const NINETYNINEACRES_BASE = 'https://www.99acres.com';

export const ninetynineacresAdapter: SourceAdapter = {
  slug: 'ninetynineacres',
  transport: 'browser',
  supports: { maxPages: 20 },
  slices: ['all'],

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
