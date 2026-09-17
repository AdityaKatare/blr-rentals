import { describe, expect, it } from 'vitest';
import {
  NormalizedListingSchema,
  SearchQuerySchema,
  amenitiesFromFlags,
  normalizeAmenities,
  normalizeFurnishing,
  parseBedrooms,
  parseRupees,
  rankListings,
  scoreCandidate,
  toSqft,
  DEDUPE_THRESHOLD,
} from '../src/index';

describe('parseRupees', () => {
  it.each([
    [95000, 95000],
    ['95,000', 95000],
    ['₹ 95,000', 95000],
    ['Rs. 25k', 25000],
    ['1.2 Lac', 120000],
    ['70,000/month', 70000],
    ['0', null],
    ['', null],
    ['call for price', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(parseRupees(input)).toBe(expected);
  });
});

describe('toSqft', () => {
  it('handles units', () => {
    expect(toSqft(1445)).toBe(1445);
    expect(toSqft('1,445', 'sq.ft')).toBe(1445);
    expect(toSqft(100, 'sqm')).toBe(1076);
    expect(toSqft(100, 'sqyd')).toBe(900);
    expect(toSqft(100, 'furlongs')).toBeNull();
    expect(toSqft(-1)).toBeNull();
  });
});

describe('parseBedrooms', () => {
  it.each([
    ['BHK2', { bedrooms: 2, is1rk: false, bedroomsPlus: false }],
    ['2 BHK', { bedrooms: 2, is1rk: false, bedroomsPlus: false }],
    ['2bhk', { bedrooms: 2, is1rk: false, bedroomsPlus: false }],
    ['1 RK', { bedrooms: 0, is1rk: true, bedroomsPlus: false }],
    ['RK1', { bedrooms: 0, is1rk: true, bedroomsPlus: false }],
    ['BHK4PLUS', { bedrooms: 4, is1rk: false, bedroomsPlus: true }],
    ['4+ BHK', { bedrooms: 4, is1rk: false, bedroomsPlus: true }],
    [3, { bedrooms: 3, is1rk: false, bedroomsPlus: false }],
    ['penthouse', null],
  ])('%s', (input, expected) => {
    expect(parseBedrooms(input)).toEqual(expected);
  });
});

describe('normalizeFurnishing', () => {
  it('maps labels', () => {
    expect(normalizeFurnishing('SEMI_FURNISHED')).toBe('semi');
    expect(normalizeFurnishing('Fully Furnished')).toBe('full');
    expect(normalizeFurnishing('NOT_FURNISHED')).toBe('unfurnished');
    expect(normalizeFurnishing(11902)).toBe('unknown');
  });
});

describe('normalizeAmenities', () => {
  it('maps codes and labels, dedupes, sorts', () => {
    expect(normalizeAmenities(['LIFT', 'Swimming Pool', 'PB', 'elevator', 'unicorn stable'])).toEqual([
      'lift',
      'pool',
      'power_backup',
    ]);
  });
  it('reads flag maps', () => {
    expect(amenitiesFromFlags({ LIFT: false, GYM: true, SERVANT: true, RWH: 'N' })).toEqual(['gym', 'servant_room']);
  });
});

describe('NormalizedListingSchema', () => {
  const valid = {
    source: 'nobroker',
    sourceListingId: '8a9fb78399eb67980199ebbd4be91eab',
    sourceUrl: 'https://www.nobroker.in/property/x/8a9fb78399eb67980199ebbd4be91eab/detail',
    title: '2 BHK House for Rent In Koramangala',
    propertyType: 'independent_house',
    bedrooms: 2,
    rent: 25000,
    lat: 12.9351929,
    lng: 77.6244807,
    geoAccuracy: 'exact',
  } as const;

  it('accepts a minimal listing and applies defaults', () => {
    const parsed = NormalizedListingSchema.parse(valid);
    expect(parsed.furnishing).toBe('unknown');
    expect(parsed.amenities).toEqual([]);
    expect(parsed.city).toBe('Bengaluru');
  });

  it('rejects missing rent and inconsistent geo', () => {
    expect(NormalizedListingSchema.safeParse({ ...valid, rent: undefined }).success).toBe(false);
    expect(NormalizedListingSchema.safeParse({ ...valid, lng: null }).success).toBe(false);
    expect(NormalizedListingSchema.safeParse({ ...valid, geoAccuracy: 'none' }).success).toBe(false);
  });
});

describe('SearchQuerySchema', () => {
  it('applies defaults', () => {
    const q = SearchQuerySchema.parse({ center: { lat: 12.93, lng: 77.62 }, rent: { max: 30000 }, bedrooms: [2] });
    expect(q.radiusKm).toBe(5);
    expect(q.sort).toBe('relevance');
    expect(q.pageSize).toBe(25);
  });
  it('rejects nonsense', () => {
    expect(SearchQuerySchema.safeParse({ center: {}, radiusKm: 100 }).success).toBe(false);
  });
});

describe('ranking and dedupe scorers', () => {
  it('ranks closer, fresher listings first', () => {
    const q = SearchQuerySchema.parse({ center: { lat: 12.93, lng: 77.62 }, rent: { max: 30000 } });
    const base = { rent: 25000, hasImages: true, hasArea: true, geoExact: true, listedBy: 'owner' as const };
    const ranked = rankListings(
      [
        { id: 'far-old', distanceM: 4500, ageDays: 25, ...base },
        { id: 'near-new', distanceM: 300, ageDays: 1, ...base },
      ],
      q,
    );
    expect(ranked.map((r) => r.id)).toEqual(['near-new', 'far-old']);
  });

  it('scores an obvious duplicate above threshold and a stranger below', () => {
    const same = scoreCandidate({
      distanceM: 20,
      rentRatio: 1,
      areaRatio: 0.98,
      societySimilarity: 0.95,
      floorMatch: true,
      totalFloorsMatch: true,
      bathroomsMatch: true,
      furnishingMatch: true,
      depositRatio: 1,
    });
    const other = scoreCandidate({
      distanceM: 240,
      rentRatio: 0.93,
      areaRatio: 0.88,
      societySimilarity: 0.1,
      floorMatch: false,
      totalFloorsMatch: false,
      bathroomsMatch: false,
      furnishingMatch: false,
      depositRatio: 0.8,
    });
    expect(same).toBeGreaterThan(0.9);
    expect(other).toBeLessThan(0.4);
  });

  it('keeps identical flats on different floors of one society apart', () => {
    const neighbours = scoreCandidate({
      distanceM: 10,
      rentRatio: 1,
      areaRatio: 1,
      societySimilarity: 1,
      floorMatch: false,
      totalFloorsMatch: true,
      bathroomsMatch: true,
      furnishingMatch: true,
      depositRatio: 1,
    });
    expect(neighbours).toBeLessThan(DEDUPE_THRESHOLD);
    expect(scoreCandidate({
      distanceM: 10,
      rentRatio: 1,
      areaRatio: 1,
      societySimilarity: 1,
      floorMatch: null,
      totalFloorsMatch: true,
      bathroomsMatch: true,
      furnishingMatch: true,
      depositRatio: 1,
    })).toBeGreaterThan(DEDUPE_THRESHOLD);
  });
});
