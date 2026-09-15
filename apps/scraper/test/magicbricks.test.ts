import { readFileSync } from 'node:fs';
import { NormalizedListingSchema } from '@blr/core';
import { describe, expect, it } from 'vitest';
import { MAGICBRICKS_SLICES, magicbricksAdapter } from '../src/sources/magicbricks/adapter';
import { parseMagicbricksSearchPage } from '../src/sources/magicbricks/parse';
import type { SearchArea } from '../src/sources/types';

const html = readFileSync(new URL('./fixtures/magicbricks-search.html', import.meta.url), 'utf8');
const PAGE_1 = 'https://www.magicbricks.com/flats-for-rent-in-koramangala-bangalore-pppfr';

const area: SearchArea = {
  id: 1,
  slug: 'koramangala',
  name: 'Koramangala',
  center: { lat: 12.9352, lng: 77.6245 },
  radiusKm: 3,
  sourceOverrides: {},
};
const ctx = { area, pageUrl: PAGE_1, fetchedAt: new Date('2026-09-15T00:00:00Z') };

const parsed = parseMagicbricksSearchPage(html, PAGE_1);
const listing = (id: string) => {
  const raw = parsed.raw.find((r) => r.id === id);
  if (!raw) throw new Error(`fixture listing ${id} missing`);
  return NormalizedListingSchema.parse(magicbricksAdapter.normalize(raw, ctx));
};

describe('magicbricks adapter URLs', () => {
  it('pages through the robots-allowed locality pages per category', () => {
    expect(magicbricksAdapter.slices).toEqual(MAGICBRICKS_SLICES);
    expect(magicbricksAdapter.buildSearchUrl(area, 1, 'flats')).toBe(PAGE_1);
    expect(magicbricksAdapter.buildSearchUrl(area, 3, 'independent-house')).toBe(
      'https://www.magicbricks.com/independent-house-for-rent-in-koramangala-bangalore-pppfr/page-3',
    );
    for (const url of MAGICBRICKS_SLICES.map((s) => magicbricksAdapter.buildSearchUrl(area, 2, s))) {
      expect(url).not.toMatch(/proptype=|\/property\//i);
    }
    expect(() => magicbricksAdapter.buildSearchUrl(area, 1, 'office-space')).toThrow(RangeError);
    expect(() => magicbricksAdapter.buildSearchUrl(area, 0, 'flats')).toThrow(RangeError);
  });

  it('uses the locality slug override and rejects anything that is not a slug', () => {
    const withOverride = { ...area, sourceOverrides: { magicbricks: { localitySlug: 'btm-layout-stage-2' } } };
    expect(magicbricksAdapter.buildSearchUrl(withOverride, 1, 'flats')).toBe(
      'https://www.magicbricks.com/flats-for-rent-in-btm-layout-stage-2-bangalore-pppfr',
    );
    const bad = { ...area, sourceOverrides: { magicbricks: { localitySlug: '../admin' } } };
    expect(() => magicbricksAdapter.buildSearchUrl(bad, 1, 'flats')).toThrow(/not a URL slug/);
  });
});

describe('parseMagicbricksSearchPage', () => {
  it('keeps residential rentals with a price and reports paging', () => {
    expect(parsed.raw.map((r) => r.id)).toEqual(['90000001', '90000002', '90000003', '90000004']);
    expect(parsed.skipped).toBe(2);
    expect(parsed.pageSize).toBe(6);
    expect(parsed.total).toBe(47);
    expect(parsed.hasNext).toBe(true);
  });

  it('stops after the last page', () => {
    const last = html.replace('"pageNo":1', '"pageNo":2').replace('"page":"1"', '"page":"2"');
    expect(parseMagicbricksSearchPage(last, `${PAGE_1}/page-2`).hasNext).toBe(false);
  });

  it('refuses a page that does not match the one requested', () => {
    expect(() => parseMagicbricksSearchPage(html, `${PAGE_1}/page-2`)).toThrow(/asked for page 2/);
  });

  it('returns nothing when redirected to the city-wide page', () => {
    const cityWide = html.replace('"localityName":"Koramangala",', '');
    expect(parseMagicbricksSearchPage(cityWide, 'https://www.magicbricks.com/flats-for-rent-in-bangalore-pppfr')).toEqual({
      raw: [],
      skipped: 0,
      hasNext: false,
      pageSize: 0,
    });
  });

  it('strips poster identity before anything else sees the listing', () => {
    const text = JSON.stringify(parsed.raw);
    expect(text).not.toMatch(/Fixture (Poster|Contact|Realty)|agentDetailUrl|actualOwner|"oid"|smouuid|pEmailuuid/);
    expect(text).not.toContain('9876543210');
  });
});

describe('normalizeMagicbricks', () => {
  it('maps an owner apartment with a map pin', () => {
    const l = listing('90000001');
    expect(l).toMatchObject({
      source: 'magicbricks',
      sourceListingId: '90000001',
      sourceUrl:
        'https://www.magicbricks.com/propertyDetails/2-BHK-1150-Sq-ft-Multistorey-Apartment-FOR-Rent-Koramangala-in-Bangalore&id=f1f1f1f1f1f1f1f1f1f1',
      propertyType: 'apartment',
      bedrooms: 2,
      is1rk: false,
      bathrooms: 2,
      balconies: 1,
      rent: 42000,
      deposit: 126000,
      maintenance: 3000,
      areaSqft: 1150,
      carpetAreaSqft: 980,
      floor: 3,
      totalFloors: 10,
      furnishing: 'semi',
      parking: 'car',
      tenantPreference: 'any',
      listedBy: 'owner',
      locality: 'Block 5th Koramangala',
      societyName: 'Aurora Heights',
      lat: 12.93401,
      lng: 77.62811,
      geoAccuracy: 'approximate',
      isVerified: true,
      availableFrom: '2026-09-15',
      postedAt: '2026-09-14T20:00:00.000Z',
      sourceUpdatedAt: '2026-09-13T18:30:00.000Z',
    });
    expect(l.amenities).toEqual(['gym', 'lift', 'pool', 'power_backup', 'security']);
    expect(l.images).toHaveLength(3);
    expect(l.images[0]).toMatchObject({ isCover: true });
    expect(l.description).toBe('Sunny 2 BHK near the park. Call [phone redacted] or write to [email redacted] to visit.');
    expect(Object.keys(l.raw)).not.toContain('dtldesc');
    expect(Object.keys(l.raw)).not.toContain('landmarkDetails');
  });

  it('maps a broker builder floor with only a locality location', () => {
    const l = listing('90000002');
    expect(l).toMatchObject({
      propertyType: 'builder_floor',
      bedrooms: 3,
      maintenance: 2000,
      areaSqft: 1400,
      carpetAreaSqft: 1400,
      floor: 0,
      totalFloors: 4,
      furnishing: 'full',
      parking: 'unknown',
      tenantPreference: 'family',
      listedBy: 'broker',
      societyName: null,
      lat: 12.928728,
      lng: 77.626569,
      geoAccuracy: 'locality_centroid',
      availableFrom: '2026-10-01',
      description: null,
      isVerified: false,
    });
    expect(l.amenities).toEqual(['lift']);
    expect(l.images).toEqual([{ url: expect.stringContaining('90000002_1'), isCover: true }]);
  });

  it('treats a pin rounded onto the locality centre as the centre', () => {
    const l = listing('90000003');
    expect(l).toMatchObject({
      propertyType: 'villa',
      bedrooms: 4,
      listedBy: 'builder',
      furnishing: 'unfurnished',
      parking: 'none',
      tenantPreference: 'bachelor',
      maintenance: null,
      geoAccuracy: 'locality_centroid',
      images: [],
      availableFrom: '2026-08-30',
    });
  });

  it('marks a studio as 1 RK and drops token maintenance', () => {
    const l = listing('90000004');
    expect(l).toMatchObject({ propertyType: 'studio', bedrooms: 0, is1rk: true, maintenance: null, deposit: null, availableFrom: null });
  });
});
