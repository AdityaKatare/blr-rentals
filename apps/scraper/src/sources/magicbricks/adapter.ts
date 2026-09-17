import type { SourceAdapter } from '../types';
import { normalizeMagicbricks } from './normalize';
import { parseMagicbricksSearchPage } from './parse';

export const MAGICBRICKS_BASE = 'https://www.magicbricks.com';

export const MAGICBRICKS_SLICES = ['flats', 'independent-house'] as const;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const magicbricksAdapter: SourceAdapter = {
  slug: 'magicbricks',
  transport: 'http',
  supports: { maxPages: 40 },
  slices: MAGICBRICKS_SLICES,

  buildSearchUrl(area, page, slice) {
    if (!(MAGICBRICKS_SLICES as readonly string[]).includes(slice)) throw new RangeError(`unknown magicbricks slice "${slice}"`);
    if (!Number.isInteger(page) || page < 1) throw new RangeError(`invalid page ${page}`);
    const overrides = area.sourceOverrides.magicbricks ?? {};
    const locality = typeof overrides.localitySlug === 'string' ? overrides.localitySlug : area.slug;
    if (!SLUG.test(locality)) throw new Error(`magicbricks locality slug "${locality}" for area "${area.slug}" is not a URL slug`);
    const path = `/${slice}-for-rent-in-${locality}-bangalore-pppfr${page > 1 ? `/page-${page}` : ''}`;
    return new URL(path, MAGICBRICKS_BASE).toString();
  },

  parseSearchPage: parseMagicbricksSearchPage,
  normalize: normalizeMagicbricks,
};
