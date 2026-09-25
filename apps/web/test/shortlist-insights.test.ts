import type { NearestMetro, SearchHit } from '@blr/db';
import { describe, expect, it } from 'vitest';
import { SHORTLIST_NEAR_METRO_M } from '@/constants/shortlist';
import { summarizeShortlist } from '@/utils/shortlist-insights';

let seq = 0;

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`,
    source: 'nobroker',
    sourceUrl: 'https://www.nobroker.in/property/1',
    title: '2 BHK flat',
    rent: 30000,
    deposit: null,
    maintenance: null,
    bedrooms: 2,
    is1rk: false,
    bedroomsPlus: false,
    bathrooms: 2,
    areaSqft: 1100,
    propertyType: 'apartment',
    furnishing: 'semi',
    parking: 'unknown',
    listedBy: 'owner',
    locality: 'Whitefield',
    societyName: null,
    societySlug: null,
    tenantPreference: 'any',
    moveInCost: null,
    geoAccuracy: 'exact',
    isVerified: false,
    amenities: [],
    imageCount: 0,
    images: [],
    availableFrom: null,
    postedAt: null,
    updatedAt: null,
    lat: 12.97,
    lng: 77.75,
    distanceM: null,
    score: null,
    status: 'active',
    rentDrop: null,
    propertyId: null,
    sources: ['nobroker'],
    otherListings: [],
    nearestMetro: null,
    ...overrides,
  };
}

const rents = (...values: number[]): SearchHit[] => values.map((rent) => hit({ rent }));

const moveIn = (total: number): SearchHit['moveInCost'] => ({
  total,
  rent: 0,
  deposit: total,
  maintenance: 0,
  brokerage: 0,
});

const metro = (distanceM: number): NearestMetro => ({ name: 'Indiranagar', lines: ['purple'], distanceM });

const other = (rent: number): SearchHit['otherListings'][number] => ({
  id: '00000000-0000-4000-8000-ffffffffffff',
  source: 'magicbricks',
  rent,
  sourceUrl: 'https://www.magicbricks.com/property/1',
  updatedAt: null,
});

describe('summarizeShortlist', () => {
  it('needs at least two live homes before summarising', () => {
    expect(summarizeShortlist([])).toBeNull();
    expect(summarizeShortlist([hit()])).toBeNull();
    expect(summarizeShortlist([hit(), hit({ status: 'removed' })])).toBeNull();
  });

  it('summarises rent as the median and the range', () => {
    expect(summarizeShortlist(rents(50000, 20000, 30000))?.rent).toEqual({ low: 20000, median: 30000, high: 50000 });
    expect(summarizeShortlist(rents(20000, 50000, 30000, 45000))?.rent.median).toBe(37500);
    expect(summarizeShortlist(rents(20000, 30001))?.rent.median).toBe(25001);
  });

  it('leaves out listings that are no longer live', () => {
    const insights = summarizeShortlist([...rents(20000, 30000), hit({ rent: 90000, status: 'stale' })]);
    expect(insights?.homes).toBe(2);
    expect(insights?.rent.high).toBe(30000);
  });

  it('counts a home saved from two portals once, at its lower rent', () => {
    const insights = summarizeShortlist([
      hit({ propertyId: 'p1', rent: 32000 }),
      hit({ propertyId: 'p1', rent: 30000 }),
      hit({ rent: 40000 }),
    ]);
    expect(insights?.homes).toBe(2);
    expect(insights?.rent).toEqual({ low: 30000, median: 35000, high: 40000 });
  });

  it('ignores listings without a usable rent', () => {
    const insights = summarizeShortlist([hit({ rent: 0 }), hit({ rent: Number.NaN }), ...rents(25000, 35000)]);
    expect(insights?.homes).toBe(2);
    expect(insights?.rent.low).toBe(25000);
  });

  it('summarises move-in cost over the homes that have one, and says how many do', () => {
    const insights = summarizeShortlist([
      hit({ moveInCost: moveIn(200000) }),
      hit({ moveInCost: moveIn(150000) }),
      hit({ moveInCost: null }),
    ]);
    expect(insights?.moveIn).toEqual({ low: 150000, median: 175000, high: 200000, known: 2 });
  });

  it('has no move-in summary when no home has a plausible deposit', () => {
    expect(summarizeShortlist(rents(20000, 30000))?.moveIn).toBeNull();
  });

  it('counts owner-listed homes', () => {
    const insights = summarizeShortlist([
      hit({ listedBy: 'owner' }),
      hit({ listedBy: 'broker' }),
      hit({ listedBy: 'builder' }),
    ]);
    expect(insights?.ownerListed).toBe(1);
  });

  it('counts homes near a metro, and homes whose location is too rough to tell', () => {
    const insights = summarizeShortlist([
      hit({ nearestMetro: metro(400) }),
      hit({ nearestMetro: metro(SHORTLIST_NEAR_METRO_M) }),
      hit({ nearestMetro: metro(SHORTLIST_NEAR_METRO_M + 1) }),
      hit({ nearestMetro: null, geoAccuracy: 'approximate' }),
      hit({ nearestMetro: null, geoAccuracy: 'locality_centroid' }),
      hit({ nearestMetro: null, geoAccuracy: 'none', lat: null, lng: null }),
    ]);
    expect(insights?.nearMetro).toBe(2);
    expect(insights?.unlocated).toBe(2);
  });

  it('breaks rent down by size, smallest first', () => {
    const insights = summarizeShortlist([
      hit({ bedrooms: 3, rent: 60000 }),
      hit({ bedrooms: 0, is1rk: true, rent: 12000 }),
      hit({ bedrooms: 2, rent: 30000 }),
      hit({ bedrooms: 3, rent: 50000 }),
    ]);
    expect(insights?.byBedrooms).toEqual([
      { bedrooms: 0, units: 1, rentMin: 12000, rentMedian: 12000, rentMax: 12000 },
      { bedrooms: 2, units: 1, rentMin: 30000, rentMedian: 30000, rentMax: 30000 },
      { bedrooms: 3, units: 2, rentMin: 50000, rentMedian: 55000, rentMax: 60000 },
    ]);
  });

  it('tallies areas by count and then name, trimming names and skipping blanks', () => {
    const insights = summarizeShortlist([
      hit({ locality: 'Whitefield' }),
      hit({ locality: ' Whitefield ' }),
      hit({ locality: 'Hebbal' }),
      hit({ locality: 'Bellandur' }),
      hit({ locality: null }),
      hit({ locality: '   ' }),
    ]);
    expect(insights?.areas).toEqual([
      { key: 'Whitefield', count: 2 },
      { key: 'Bellandur', count: 1 },
      { key: 'Hebbal', count: 1 },
    ]);
  });

  it('tallies furnishing without unknowns, and property types', () => {
    const insights = summarizeShortlist([
      hit({ furnishing: 'semi', propertyType: 'apartment' }),
      hit({ furnishing: 'semi', propertyType: 'villa' }),
      hit({ furnishing: 'full', propertyType: 'apartment' }),
      hit({ furnishing: 'unknown', propertyType: 'apartment' }),
    ]);
    expect(insights?.furnishing).toEqual([
      { key: 'semi', count: 2 },
      { key: 'full', count: 1 },
    ]);
    expect(insights?.propertyTypes).toEqual([
      { key: 'apartment', count: 3 },
      { key: 'villa', count: 1 },
    ]);
  });

  it('counts recent rent cuts and homes listed for less on another portal', () => {
    const insights = summarizeShortlist([
      hit({ rentDrop: { from: 35000, at: '2026-09-20T00:00:00Z' } }),
      hit({ rent: 30000, otherListings: [other(28000)] }),
      hit({ rent: 30000, otherListings: [other(31000)] }),
    ]);
    expect(insights?.rentCuts).toBe(1);
    expect(insights?.cheaperElsewhere).toBe(1);
  });

  it('handles a full shortlist', () => {
    const insights = summarizeShortlist(rents(...Array.from({ length: 100 }, (_, i) => 10000 + i * 1000)));
    expect(insights?.homes).toBe(100);
    expect(insights?.rent).toEqual({ low: 10000, median: 59500, high: 109000 });
  });
});
