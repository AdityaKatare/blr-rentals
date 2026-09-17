import { readFileSync } from 'node:fs';
import { NormalizedListingSchema } from '@blr/core';
import { describe, expect, it } from 'vitest';
import { NOBROKER_SLICES, nobrokerAdapter } from '../src/sources/nobroker/adapter';
import { parseNobrokerSearchPage } from '../src/sources/nobroker/parse';
import type { SearchArea } from '../src/sources/types';

const html = readFileSync(new URL('./fixtures/nobroker-search.html', import.meta.url), 'utf8');
const nextHtml = readFileSync(new URL('./fixtures/nobroker-search-next.html', import.meta.url), 'utf8');

const area: SearchArea = {
  id: 1,
  slug: 'koramangala',
  name: 'Koramangala',
  center: { lat: 12.9352, lng: 77.6245 },
  radiusKm: 3,
  sourceOverrides: {},
};
const ctx = { area, pageUrl: 'https://www.nobroker.in/x', fetchedAt: new Date('2026-09-15T00:00:00Z') };

const parsed = parseNobrokerSearchPage(html, 'https://www.nobroker.in/x');
const byId = (suffix: string) => {
  const raw = parsed.raw.find((r) => String(r.id).endsWith(suffix));
  if (!raw) throw new Error(`fixture listing ${suffix} missing`);
  return NormalizedListingSchema.parse(nobrokerAdapter.normalize(raw, ctx));
};

describe('nobroker adapter URLs', () => {
  it('builds one newest-first search per BHK slice and refuses pages beyond the first', () => {
    expect(nobrokerAdapter.slices).toEqual(NOBROKER_SLICES);
    const urls = NOBROKER_SLICES.map((slice) => new URL(nobrokerAdapter.buildSearchUrl(area, 1, slice)));
    expect(urls.map((u) => u.searchParams.get('type'))).toEqual([...NOBROKER_SLICES]);
    for (const u of urls) {
      expect(u.pathname).toBe('/property/rent/bangalore/Koramangala');
      expect(u.searchParams.get('orderBy')).toBe('lastUpdateDate,desc');
      expect(u.searchParams.get('radius')).toBe('3.0');
      expect(u.searchParams.has('pageNo')).toBe(false);
      expect(JSON.parse(Buffer.from(u.searchParams.get('searchParam')!, 'base64').toString())).toEqual([
        { lat: 12.9352, lon: 77.6245, placeName: 'Koramangala' },
      ]);
    }
    expect(nobrokerAdapter.supports.maxPages).toBe(1);
    expect(() => nobrokerAdapter.buildSearchUrl(area, 2, 'BHK2')).toThrow(RangeError);
    expect(() => nobrokerAdapter.buildSearchUrl(area, 1, 'BHK9')).toThrow(RangeError);
  });

  it('uses the locality override when present', () => {
    const url = new URL(nobrokerAdapter.buildSearchUrl({ ...area, sourceOverrides: { nobroker: { locality: 'HSR Layout' } } }, 1, 'BHK1'));
    expect(url.pathname).toBe('/property/rent/bangalore/HSR%20Layout');
    expect(url.searchParams.get('locality')).toBe('HSR Layout');
  });
});

describe('parseNobrokerSearchPage', () => {
  it('returns main results only, skips leases and reports the total', () => {
    expect(parsed.pageSize).toBe(9);
    expect(parsed.raw).toHaveLength(6);
    expect(parsed.skipped).toBe(3);
    expect(parsed.total).toBe(1530);
    expect(parsed.hasNext).toBe(true);
    expect(parsed.raw.some((r) => r.id === 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
  });

  it('strips poster identity before anything else sees the listing', () => {
    for (const raw of parsed.raw) {
      expect(raw).not.toHaveProperty('ownerName');
      expect(raw).not.toHaveProperty('ownerId');
      expect(raw).not.toHaveProperty('verifiedByUser');
    }
    expect(html).toContain('9876543210');
    expect(JSON.stringify(parsed.raw)).not.toContain('9876543210');
  });

  it('reads the same listings and total from the Next.js page variant', () => {
    expect(nextHtml).not.toContain('nb.appState');
    expect(parseNobrokerSearchPage(nextHtml, 'https://www.nobroker.in/x')).toEqual(parsed);
  });

  it('fails loudly when the state blob changes shape', () => {
    expect(() => parseNobrokerSearchPage('<script>nb.appState = {"other":{}};</script>', 'u')).toThrow(/listPage missing/);
    expect(() => parseNobrokerSearchPage('<script>self.__next_f.push([1,"\\"initialProperties\\":{}"])</script>', 'u')).toThrow(/initialProperties is not an array/);
    expect(() => parseNobrokerSearchPage('<html></html>', 'u')).toThrow(/neither nb.appState nor Next.js initialProperties/);
  });
});

describe('normalizeNobroker', () => {
  it('produces a valid listing for every parsed fixture entry', () => {
    for (const raw of parsed.raw) {
      expect(() => NormalizedListingSchema.parse(nobrokerAdapter.normalize(raw, ctx))).not.toThrow();
    }
  });

  it('maps a sponsored apartment with maintenance and a real society', () => {
    const l = byId('000001');
    expect(l).toMatchObject({
      source: 'nobroker',
      sourceListingId: 'f1c7ae00000000000000000000000001',
      sourceUrl: 'https://www.nobroker.in/property/3-bhk-apartment-for-rent-in-hosapalya-bangalore-for-rs-55000/f1c7ae00000000000000000000000001/detail',
      propertyType: 'apartment',
      bedrooms: 3,
      is1rk: false,
      rent: 55000,
      maintenance: 3300,
      societyName: 'Sample Residency 2',
      listedBy: 'owner',
      city: 'Bengaluru',
      isSponsored: true,
      lat: 12.931,
      lng: 77.621,
      geoAccuracy: 'exact',
    });
    expect(l.amenities).toEqual(expect.arrayContaining(['lift', 'gym', 'pool']));
    expect(l.images[0]).toEqual({
      url: 'https://assets.nobroker.in/images/f1c7ae00000000000000000000000001/f1c7ae00000000000000000000000001_0_large.jpg',
      isCover: true,
    });
    expect(l.raw).not.toHaveProperty('photos');
    expect(l.raw).not.toHaveProperty('aea__');
  });

  it('treats placeholder societies as none and keeps pincodes', () => {
    const l = byId('000002');
    expect(l.propertyType).toBe('independent_house');
    expect(l.societyName).toBeNull();
    expect(l.pincode).toBe('560034');
    expect(l.subLocality).toBe('Sample Road 3');
  });

  it('falls back past sentinel locality values', () => {
    const base = parsed.raw[0]!;
    const l = NormalizedListingSchema.parse(nobrokerAdapter.normalize({ ...base, nbLocality: 'NOT_FOUND', locality: 'Koramangala', street: 'null' }, ctx));
    expect(l.locality).toBe('Koramangala');
    expect(l.subLocality).toBeNull();
  });

  it('drops generic words used as society names', () => {
    const base = parsed.raw[0]!;
    for (const society of ['Apartment', 'apartments', 'Standalone', 'Independent Building', 'NA', '--']) {
      expect(NormalizedListingSchema.parse(nobrokerAdapter.normalize({ ...base, society }, ctx)).societyName).toBeNull();
    }
    expect(NormalizedListingSchema.parse(nobrokerAdapter.normalize({ ...base, society: 'Apartment Gardens' }, ctx)).societyName).toBe('Apartment Gardens');
  });

  it('marks landmark-only coordinates as approximate', () => {
    expect(byId('000003').geoAccuracy).toBe('approximate');
  });

  it('skips lease-flagged listings even when they carry a rent figure', () => {
    expect(parsed.raw.some((r) => String(r.id).endsWith('000005'))).toBe(false);
  });

  it('maps 1 RK and drops placeholder maintenance amounts', () => {
    const rk = byId('000006');
    expect(rk).toMatchObject({ bedrooms: 0, is1rk: true });
    expect(rk.maintenance).toBeNull();
  });

  it('formats dates in IST and redacts phone numbers in descriptions', () => {
    const l = byId('000001');
    expect(l.postedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(l.sourceUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const withDate = parsed.raw.find((r) => typeof r.availableFrom === 'number')!;
    const expected = new Date((withDate.availableFrom as number) + 5.5 * 3600_000).toISOString().slice(0, 10);
    expect(NormalizedListingSchema.parse(nobrokerAdapter.normalize(withDate, ctx)).availableFrom).toBe(expected);
    const described = parsed.raw
      .map((r) => NormalizedListingSchema.parse(nobrokerAdapter.normalize(r, ctx)))
      .filter((x) => x.description);
    expect(described.length).toBeGreaterThan(0);
    for (const d of described) expect(d.description).not.toMatch(/\d{10}/);
  });

  it('rejects listings without a usable id, url or type', () => {
    const base = parsed.raw[0]!;
    expect(() => nobrokerAdapter.normalize({ ...base, id: '' }, ctx)).toThrow(/without id/);
    expect(() => nobrokerAdapter.normalize({ ...base, detailUrl: undefined }, ctx)).toThrow(/detailUrl/);
    expect(() => nobrokerAdapter.normalize({ ...base, type: 'MANSION' }, ctx)).toThrow(/unrecognised type/);
  });
});
