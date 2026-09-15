import { randomBytes } from 'node:crypto';
import { SearchQuerySchema } from '@blr/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../src/client';
import { dedupeListings } from '../src/dedupe';
import { loadEnv } from '../src/env';
import { searchListings } from '../src/search';

loadEnv();

async function tryConnect(): Promise<DbHandle | null> {
  if (!process.env.DATABASE_URL) return null;
  const handle = createDb(process.env.DATABASE_URL);
  try {
    await handle.sql`SELECT 1 FROM properties LIMIT 1`;
    return handle;
  } catch {
    await handle.close().catch(() => undefined);
    return null;
  }
}

const handle = await tryConnect();
const tag = randomBytes(4).toString('hex');
const CENTER = { lat: 12.72, lng: 77.35 };
const north = (m: number) => CENTER.lat + m / 111_200;

interface Fixture {
  key: string;
  source: 'a' | 'b';
  metersNorth: number;
  rent: number;
  area: number | null;
  society: string | null;
  floor: number | null;
  furnishing: 'semi' | 'full' | 'unfurnished';
  deposit: number | null;
  images: number;
  geo?: 'exact' | 'locality_centroid';
}

const FIXTURES: Fixture[] = [
  { key: 'home-on-a', source: 'a', metersNorth: 0, rent: 30000, area: 1100, society: 'Prestige Lakeside Habitat', floor: 5, furnishing: 'semi', deposit: 150000, images: 3 },
  { key: 'home-on-b', source: 'b', metersNorth: 40, rent: 31000, area: 1150, society: 'Prestige Lake Side Habitat', floor: 5, furnishing: 'semi', deposit: 150000, images: 8 },
  { key: 'neighbour', source: 'a', metersNorth: 10, rent: 30000, area: 1100, society: 'Prestige Lakeside Habitat', floor: 9, furnishing: 'semi', deposit: 150000, images: 2 },
  { key: 'stranger', source: 'b', metersNorth: 180, rent: 29000, area: 800, society: 'Sobha Dream Acres', floor: 2, furnishing: 'unfurnished', deposit: 100000, images: 1 },
  { key: 'centre-on-a', source: 'a', metersNorth: 900, rent: 52000, area: 1500, society: null, floor: null, furnishing: 'full', deposit: 200000, images: 1, geo: 'locality_centroid' },
  { key: 'centre-on-b', source: 'b', metersNorth: 900, rent: 52000, area: 1500, society: null, floor: null, furnishing: 'full', deposit: 200000, images: 1, geo: 'locality_centroid' },
];

describe.runIf(handle)('dedupeListings against Postgres', () => {
  const sql = handle!.sql;
  const sourceIds: Record<'a' | 'b', number> = { a: 0, b: 0 };
  const ids: Record<string, string> = {};

  const propertyOf = async (key: string) =>
    (await sql<{ property_id: string | null }[]>`SELECT property_id FROM listings WHERE id = ${ids[key]!}`)[0]!.property_id;

  beforeAll(async () => {
    for (const s of ['a', 'b'] as const) {
      const [row] = await sql<{ id: number }[]>`
        INSERT INTO sources (slug, name, base_url, enabled) VALUES (${`zz-dedupe-${s}-${tag}`}, ${`dedupe ${s}`}, 'https://example.com', false)
        RETURNING id`;
      sourceIds[s] = row!.id;
    }
    for (const f of FIXTURES) {
      const images = JSON.stringify(Array.from({ length: f.images }, (_, i) => ({ url: `https://example.com/${f.key}/${i}.jpg` })));
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO listings (source_id, source_listing_id, source_url, title, property_type, bedrooms, bathrooms, rent, deposit,
                              area_sqft, floor, total_floors, furnishing, society_name, location, geo_accuracy, images, raw_hash)
        VALUES (${sourceIds[f.source]}, ${f.key}, ${`https://example.com/${f.key}`}, ${f.key}, 'apartment', 2, 2, ${f.rent},
                ${f.deposit}, ${f.area}, ${f.floor}, 14, ${f.furnishing}::furnishing, ${f.society},
                ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${north(f.metersNorth)}), 4326)::geography, ${f.geo ?? 'exact'}::geo_accuracy, ${images}::jsonb, 'h')
        RETURNING id`;
      ids[f.key] = row!.id;
    }
  });

  afterAll(async () => {
    const props = await sql<{ property_id: string }[]>`
      SELECT DISTINCT property_id FROM listings WHERE source_id IN (${sourceIds.a}, ${sourceIds.b}) AND property_id IS NOT NULL`;
    await sql`DELETE FROM listings WHERE source_id IN (${sourceIds.a}, ${sourceIds.b})`;
    for (const p of props) await sql`DELETE FROM properties WHERE id = ${p.property_id}`;
    await sql`DELETE FROM sources WHERE id IN (${sourceIds.a}, ${sourceIds.b})`;
    await handle!.close();
  });

  it('groups the same flat across sources and keeps neighbours and strangers apart', async () => {
    const summary = await dedupeListings(sql, { listingIds: Object.values(ids) });
    expect(summary.examined).toBe(FIXTURES.length);

    const [a, b, neighbour, stranger, centreA, centreB] = await Promise.all(FIXTURES.map((f) => propertyOf(f.key)));
    expect(a).not.toBeNull();
    expect(b).toBe(a);
    expect(neighbour).not.toBe(a);
    expect(stranger).not.toBe(a);
    expect(neighbour).not.toBe(stranger);
    expect(centreA).not.toBe(centreB);

    const [property] = await sql<{ listing_count: number; rent_min: number; rent_max: number; canonical_listing_id: string; n_sources: number }[]>`
      SELECT listing_count, rent_min, rent_max, canonical_listing_id, cardinality(sources) AS n_sources FROM properties WHERE id = ${a!}`;
    expect(property).toEqual({ listing_count: 2, rent_min: 30000, rent_max: 31000, canonical_listing_id: ids['home-on-b'], n_sources: 2 });
  });

  it('is stable when run again', async () => {
    const before = await Promise.all(FIXTURES.map((f) => propertyOf(f.key)));
    const summary = await dedupeListings(sql, { listingIds: Object.values(ids) });
    expect(summary).toMatchObject({ examined: FIXTURES.length, created: 0, moved: 0, unchanged: FIXTURES.length });
    expect(await Promise.all(FIXTURES.map((f) => propertyOf(f.key)))).toEqual(before);
  });

  it('shows one card per home with the other listing attached', async () => {
    const result = await searchListings(sql, SearchQuerySchema.parse({ center: CENTER, radiusKm: 1, sort: 'rent_asc' }));
    const mine = result.hits.filter((h) => h.sourceUrl.startsWith('https://example.com/') && !h.sourceUrl.includes('/centre-'));
    expect(mine.map((h) => h.sourceUrl.split('/').pop())).toEqual(['stranger', 'home-on-a', 'neighbour']);
    const home = mine.find((h) => h.sourceUrl.endsWith('home-on-a'))!;
    expect(home.otherListings).toEqual([
      expect.objectContaining({ id: ids['home-on-b'], rent: 31000, sourceUrl: 'https://example.com/home-on-b' }),
    ]);
    expect(home.sources).toHaveLength(2);
    expect(mine.find((h) => h.sourceUrl.endsWith('stranger'))!.otherListings).toEqual([]);
  });

  it('splits a listing out when it stops matching', async () => {
    const shared = await propertyOf('home-on-a');
    await sql`UPDATE listings SET rent = 45000 WHERE id = ${ids['home-on-b']!}`;
    const summary = await dedupeListings(sql, { listingIds: [ids['home-on-b']!] });
    expect(summary).toMatchObject({ moved: 1, created: 1 });
    expect(await propertyOf('home-on-b')).not.toBe(shared);
    expect(await propertyOf('home-on-a')).toBe(shared);
    const [left] = await sql<{ listing_count: number; rent_max: number }[]>`
      SELECT listing_count, rent_max FROM properties WHERE id = ${shared!}`;
    expect(left).toEqual({ listing_count: 1, rent_max: 30000 });
  });
});
