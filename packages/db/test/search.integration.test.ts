import { randomBytes } from 'node:crypto';
import { SearchQuerySchema, type SearchQueryInput, type SourceSlug } from '@blr/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../src/client';
import { loadEnv } from '../src/env';
import { CARD_IMAGE_LIMIT } from '../src/queries/hits';
import { listingsByIds } from '../src/queries/listings';
import { findLocality } from '../src/queries/localities';
import { searchListings } from '../src/queries/search';

loadEnv();

async function tryConnect(): Promise<DbHandle | null> {
  if (!process.env.DATABASE_URL) return null;
  const handle = createDb(process.env.DATABASE_URL);
  try {
    await handle.sql`SELECT 1 FROM localities LIMIT 1`;
    return handle;
  } catch {
    await handle.close().catch(() => undefined);
    return null;
  }
}

const handle = await tryConnect();
const slug = `zz-search-${randomBytes(4).toString('hex')}` as SourceSlug;
const CENTER = { lat: 12.9, lng: 77.9 };
const metroPrefix = `zz-metro-${randomBytes(4).toString('hex')}`;
const OPEN_STATION = { slug: `${metroPrefix}-open`, name: 'Test Open Station', km: 0.7 };
const UPCOMING_STATION = { slug: `${metroPrefix}-upcoming`, name: 'Test Upcoming Station', km: 4 };

const offsetLat = (km: number) => CENTER.lat + km / 111.2;

const fixtures = [
  { id: 'near-2bhk', km: 0.5, rent: 25000, bedrooms: 2, furnishing: 'semi', type: 'apartment', parking: 'car', amenities: ['gym', 'lift'], updatedDaysAgo: 5, available: '2026-09-01' },
  { id: 'mid-2bhk-cheap', km: 2, rent: 18000, bedrooms: 2, furnishing: 'unfurnished', type: 'independent_house', parking: 'none', amenities: [], updatedDaysAgo: 1, available: '2026-12-01' },
  { id: 'far-3bhk', km: 4, rent: 60000, bedrooms: 3, furnishing: 'full', type: 'apartment', parking: 'both', amenities: ['gym', 'lift', 'pool'], updatedDaysAgo: 0, available: null },
  { id: 'rk', km: 1, rent: 9000, bedrooms: 0, furnishing: 'semi', type: 'apartment', parking: 'bike', amenities: ['lift'], updatedDaysAgo: 20, available: null },
  { id: 'outside', km: 12, rent: 20000, bedrooms: 2, furnishing: 'semi', type: 'apartment', parking: 'car', amenities: [], updatedDaysAgo: 0, available: null },
  { id: 'stale', km: 0.2, rent: 20000, bedrooms: 2, furnishing: 'semi', type: 'apartment', parking: 'car', amenities: [], updatedDaysAgo: 0, available: null, status: 'stale' },
];

describe.runIf(handle)('searchListings against Postgres', () => {
  const sql = handle!.sql;
  let sourceId: number;

  const search = (input: Omit<SearchQueryInput, 'center'> & { center?: SearchQueryInput['center'] }) =>
    searchListings(sql, SearchQuerySchema.parse({ center: CENTER, sources: undefined, ...input }), new Date());

  const ids = (hits: { sourceUrl: string }[]) => hits.map((h) => h.sourceUrl.split('/').pop());

  beforeAll(async () => {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO sources (slug, name, base_url, enabled) VALUES (${slug}, 'search test', 'https://example.com', false)
      RETURNING id`;
    sourceId = row!.id;
    for (const f of fixtures) {
      await sql`
        INSERT INTO listings (source_id, source_listing_id, source_url, title, property_type, bedrooms, is_1rk, rent,
                              furnishing, parking, listed_by, location, geo_accuracy, amenities, images,
                              available_from, source_updated_at, raw_hash, status)
        VALUES (${sourceId}, ${f.id}, ${`https://example.com/${f.id}`}, ${f.id}, ${f.type}::property_type, ${f.bedrooms},
                ${f.bedrooms === 0}, ${f.rent}, ${f.furnishing}::furnishing, ${f.parking}::parking, 'owner',
                ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${offsetLat(f.km)}), 4326)::geography, 'exact',
                ${`{${f.amenities.join(',')}}`}::text[], '[]'::jsonb, ${f.available}::date,
                now() - make_interval(days => ${f.updatedDaysAgo}), 'h', ${f.status ?? 'active'}::listing_status)`;
    }
    for (const [station, status] of [
      [OPEN_STATION, 'open'],
      [UPCOMING_STATION, 'upcoming'],
    ] as const) {
      await sql`
        INSERT INTO metro_stations (slug, name, lines, status, location)
        VALUES (${station.slug}, ${station.name}, '{purple}', ${status},
                ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${offsetLat(station.km)}), 4326)::geography)`;
    }
  });

  afterAll(async () => {
    await sql`DELETE FROM listings WHERE source_id = ${sourceId}`;
    await sql`DELETE FROM sources WHERE id = ${sourceId}`;
    await sql`DELETE FROM metro_stations WHERE slug LIKE ${`${metroPrefix}-%`}`;
    await handle!.close();
  });

  const scoped = { sources: undefined } as const;

  it('limits to active listings inside the radius', async () => {
    const r = await search({ ...scoped, radiusKm: 5, sort: 'distance' });
    const mine = ids(r.hits).filter((id) => fixtures.some((f) => f.id === id));
    expect(mine).toEqual(['near-2bhk', 'rk', 'mid-2bhk-cheap', 'far-3bhk']);
    const near = r.hits.find((h) => h.sourceUrl.endsWith('near-2bhk'))!;
    expect(near.distanceM).toBeGreaterThan(450);
    expect(near.distanceM).toBeLessThan(550);
  });

  it('applies rent, bedroom, furnishing, type, amenity, parking and availability filters', async () => {
    const only = async (input: Omit<SearchQueryInput, 'center'>) =>
      ids((await search({ radiusKm: 5, sort: 'distance', ...input })).hits).filter((id) => fixtures.some((f) => f.id === id));

    expect(await only({ rent: { max: 20000 } })).toEqual(['rk', 'mid-2bhk-cheap']);
    expect(await only({ rent: { min: 20000 } })).toEqual(['near-2bhk', 'far-3bhk']);
    expect(await only({ bedrooms: [0] })).toEqual(['rk']);
    expect(await only({ bedrooms: [2, 3] })).toEqual(['near-2bhk', 'mid-2bhk-cheap', 'far-3bhk']);
    expect(await only({ furnishing: ['full', 'unfurnished'] })).toEqual(['mid-2bhk-cheap', 'far-3bhk']);
    expect(await only({ propertyTypes: ['independent_house'] })).toEqual(['mid-2bhk-cheap']);
    expect(await only({ amenitiesAll: ['gym', 'lift'] })).toEqual(['near-2bhk', 'far-3bhk']);
    expect(await only({ parking: 'required' })).toEqual(['near-2bhk', 'rk', 'far-3bhk']);
    expect(await only({ availableBy: '2026-10-01' })).toEqual(['near-2bhk', 'rk', 'far-3bhk']);
  });

  it('sorts by rent and by recency, and paginates', async () => {
    const byRent = await search({ radiusKm: 5, sort: 'rent_asc', rent: { min: 9000, max: 60000 }, bedrooms: [0, 2, 3] });
    expect(ids(byRent.hits).filter((id) => fixtures.some((f) => f.id === id))).toEqual(['rk', 'mid-2bhk-cheap', 'near-2bhk', 'far-3bhk']);

    const newest = await search({ radiusKm: 5, sort: 'newest', amenitiesAll: ['lift'] });
    expect(ids(newest.hits).filter((id) => fixtures.some((f) => f.id === id))).toEqual(['far-3bhk', 'near-2bhk', 'rk']);

    const page2 = await search({ radiusKm: 5, sort: 'distance', amenitiesAll: ['lift'], pageSize: 2, page: 2 });
    expect(page2.pages).toBe(Math.ceil(page2.total / 2));
    expect(page2.hits).toHaveLength(Math.min(2, page2.total - 2));
  });

  it('ranks by relevance with scores and pages over the ranked list', async () => {
    const r = await search({ radiusKm: 5, amenitiesAll: ['lift'], rent: { max: 60000 } });
    expect(r.rankedCandidates).toBe(r.total);
    const scores = r.hits.map((h) => h.score!);
    expect(scores.every((s) => s > 0 && s <= 1)).toBe(true);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('returns card photos, recent rent drops and saved listings by id', async () => {
    const [near] = await sql<{ id: string }[]>`SELECT id FROM listings WHERE source_id = ${sourceId} AND source_listing_id = 'near-2bhk'`;
    const [stale] = await sql<{ id: string }[]>`SELECT id FROM listings WHERE source_id = ${sourceId} AND source_listing_id = 'stale'`;
    const photos = Array.from({ length: CARD_IMAGE_LIMIT + 3 }, (_, i) => ({ url: `https://example.com/p/${i}.jpg` }));
    await sql`UPDATE listings SET images = ${JSON.stringify(photos)}::jsonb WHERE id = ${near!.id}`;
    await sql`
      INSERT INTO listing_changes (listing_id, observed_at, field, old_value, new_value) VALUES
        (${near!.id}, now() - interval '40 days', 'rent', '40000'::jsonb, '30000'::jsonb),
        (${near!.id}, now() - interval '3 days', 'rent', '28000'::jsonb, '26000'::jsonb),
        (${near!.id}, now() - interval '1 day', 'rent', '26000'::jsonb, '25000'::jsonb),
        (${near!.id}, now() - interval '1 day', 'available_from', '"2026-08-01"'::jsonb, '"2026-09-01"'::jsonb)`;

    const r = await search({ radiusKm: 1, sort: 'distance', bedrooms: [2] });
    const hit = r.hits.find((h) => h.id === near!.id)!;
    expect(hit.images).toEqual(photos.slice(0, CARD_IMAGE_LIMIT).map((p) => p.url));
    expect(hit.imageCount).toBe(CARD_IMAGE_LIMIT + 3);
    expect(hit.rentDrop).toMatchObject({ from: 28000 });
    expect(hit.status).toBe('active');

    const saved = await listingsByIds(sql, [stale!.id, 'not-a-uuid', near!.id]);
    expect(saved.map((h) => h.id)).toEqual([stale!.id, near!.id]);
    expect(saved[0]).toMatchObject({ status: 'stale', distanceM: null, rentDrop: null, images: [] });
    expect(saved[1]!.rentDrop).toMatchObject({ from: 28000 });
    expect(await listingsByIds(sql, [])).toEqual([]);
  });

  it('filters by walking distance to open metro stations and annotates the nearest one', async () => {
    const centroidId = 'centroid-near-metro';
    await sql`
      INSERT INTO listings (source_id, source_listing_id, source_url, title, property_type, bedrooms, is_1rk, rent,
                            furnishing, parking, listed_by, location, geo_accuracy, amenities, images, raw_hash, status)
      VALUES (${sourceId}, ${centroidId}, ${`https://example.com/${centroidId}`}, ${centroidId}, 'apartment', 2, false, 22000,
              'semi', 'car', 'owner', ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${offsetLat(0.7)}), 4326)::geography,
              'locality_centroid', '{}'::text[], '[]'::jsonb, 'h', 'active')`;
    const known = new Set([...fixtures.map((f) => f.id), centroidId]);
    const mine = async (nearMetroM: 500 | 1000 | 1500) =>
      ids((await search({ radiusKm: 5, sort: 'distance', nearMetroM })).hits).filter((id) => known.has(id!));

    expect(await mine(500)).toEqual(['near-2bhk', 'rk']);
    expect(await mine(1500)).toEqual(['near-2bhk', 'rk', 'mid-2bhk-cheap']);

    const r = await search({ radiusKm: 5, sort: 'distance' });
    const byId = (id: string) => r.hits.find((h) => h.sourceUrl === `https://example.com/${id}`)!;
    expect(byId('near-2bhk').nearestMetro).toMatchObject({ name: OPEN_STATION.name, lines: ['purple'] });
    expect(byId('near-2bhk').nearestMetro!.distanceM).toBeGreaterThan(150);
    expect(byId('near-2bhk').nearestMetro!.distanceM).toBeLessThan(250);
    expect(byId('mid-2bhk-cheap').nearestMetro!.distanceM).toBeGreaterThan(1200);
    expect(byId('far-3bhk').nearestMetro).toBeNull();
    expect(byId(centroidId).nearestMetro).toBeNull();

    const saved = await listingsByIds(sql, [byId('near-2bhk').id]);
    expect(saved[0]!.nearestMetro).toMatchObject({ name: OPEN_STATION.name });

    await sql`DELETE FROM listings WHERE source_id = ${sourceId} AND source_listing_id = ${centroidId}`;
  });

  it('centres on a locality by id and matches locality names loosely', async () => {
    const kora = await findLocality(sql, 'kormangala');
    expect(kora?.name).toBe('Koramangala');
    expect((await findLocality(sql, 'HSR'))?.name).toBe('HSR Layout');
    expect(await findLocality(sql, 'zzzz-nowhere')).toBeNull();
    const r = await search({ center: { localityId: kora!.id }, radiusKm: 1 });
    expect(r.center.locality?.name).toBe('Koramangala');
    expect(r.hits.every((h) => !h.sourceUrl.startsWith('https://example.com/'))).toBe(true);
    await expect(search({ center: { localityId: 999_999 } })).rejects.toThrow(/unknown locality/);
  });
});
