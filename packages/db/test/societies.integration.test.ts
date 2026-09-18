import { randomBytes } from 'node:crypto';
import { societySlug, type SourceSlug } from '@blr/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../src/client';
import { loadEnv } from '../src/env';
import { findSociety, listSocieties, societyListings, societyOptions } from '../src/queries/societies';

loadEnv();

async function tryConnect(): Promise<DbHandle | null> {
  if (!process.env.DATABASE_URL) return null;
  const handle = createDb(process.env.DATABASE_URL);
  try {
    await handle.sql`SELECT 1 FROM listings LIMIT 1`;
    return handle;
  } catch {
    await handle.close().catch(() => undefined);
    return null;
  }
}

const handle = await tryConnect();
const slug = `zz-society-${randomBytes(4).toString('hex')}` as SourceSlug;
const CENTER = { lat: 12.8, lng: 77.8 };
const suffix = randomBytes(3).toString('hex');
const TOWERS = `Zz Test Towers ${suffix}`;
const TOWERS_SHOUTED = TOWERS.toUpperCase();
const COURT = `Zz Quiet Court ${suffix}`;
const TOWERS_SLUG = societySlug(TOWERS)!;
const STATION = { slug: `zz-metro-${suffix}`, name: 'Zz Test Station', km: 0.4 };
const stationLat = CENTER.lat + STATION.km / 111.2;

const fixtures = [
  { id: 's-3bhk', society: TOWERS, bedrooms: 3, rent: 60000, deposit: 300000, maintenance: 4000, listedBy: 'owner', status: 'active' },
  { id: 's-2bhk-cheap', society: TOWERS_SHOUTED, bedrooms: 2, rent: 30000, deposit: 150000, maintenance: null, listedBy: 'broker', status: 'active' },
  { id: 's-2bhk', society: TOWERS, bedrooms: 2, rent: 40000, deposit: 200000, maintenance: 2000, listedBy: 'owner', status: 'active' },
  { id: 's-gone', society: TOWERS, bedrooms: 2, rent: 20000, deposit: 100000, maintenance: null, listedBy: 'owner', status: 'removed' },
  { id: 's-other', society: COURT, bedrooms: 1, rent: 25000, deposit: 125000, maintenance: null, listedBy: 'owner', status: 'active' },
  { id: 's-nameless', society: null, bedrooms: 2, rent: 35000, deposit: 175000, maintenance: null, listedBy: 'owner', status: 'active' },
];

describe.runIf(handle)('society queries against Postgres', () => {
  const sql = handle!.sql;
  let sourceId: number;

  beforeAll(async () => {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO sources (slug, name, base_url, enabled) VALUES (${slug}, 'society test', 'https://example.com', false)
      RETURNING id`;
    sourceId = row!.id;
    await sql`
      INSERT INTO metro_stations (slug, name, lines, status, location)
      VALUES (${STATION.slug}, ${STATION.name}, '{purple,green}', 'open',
              ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${stationLat}), 4326)::geography)`;
    for (const f of fixtures) {
      await sql`
        INSERT INTO listings (source_id, source_listing_id, source_url, title, property_type, bedrooms, is_1rk, rent,
                              deposit, maintenance, furnishing, parking, listed_by, society_name, locality,
                              location, geo_accuracy, amenities, images, raw_hash, status)
        VALUES (${sourceId}, ${f.id}, ${`https://example.com/${f.id}`}, ${f.id}, 'apartment', ${f.bedrooms}, false, ${f.rent},
                ${f.deposit}, ${f.maintenance}, 'semi'::furnishing, 'car'::parking, ${f.listedBy}::listed_by,
                ${f.society}, 'Zz Test Locality',
                ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${CENTER.lat}), 4326)::geography, 'exact',
                '{}'::text[], '[]'::jsonb, 'h', ${f.status}::listing_status)`;
    }
  });

  afterAll(async () => {
    await sql`DELETE FROM listings WHERE source_id = ${sourceId}`;
    await sql`DELETE FROM sources WHERE id = ${sourceId}`;
    await sql`DELETE FROM metro_stations WHERE slug = ${STATION.slug}`;
    await handle!.close();
  });

  it('folds spelling variants into one apartment and counts only live units', async () => {
    const society = await findSociety(sql, TOWERS_SLUG);
    expect(society).toMatchObject({
      slug: TOWERS_SLUG,
      units: 3,
      rentMin: 30000,
      rentMax: 60000,
      locality: 'Zz Test Locality',
    });
    expect(society!.name).toBe(TOWERS);
    expect(society!.localities).toEqual(['Zz Test Locality']);
    expect(society!.center!.lat).toBeCloseTo(CENTER.lat, 5);
    expect(society!.sources).toEqual([slug]);
    expect(await findSociety(sql, 'zz-no-such-society')).toBeNull();
  });

  it('measures the walk to the nearest open station from the middle of the apartment', async () => {
    const society = await findSociety(sql, TOWERS_SLUG);
    expect(society!.nearestMetro).toMatchObject({ name: STATION.name, lines: ['purple', 'green'] });
    expect(society!.nearestMetro!.distanceM).toBeGreaterThan(350);
    expect(society!.nearestMetro!.distanceM).toBeLessThan(450);

    const listed = await listSocieties(sql, { q: `Test Towers ${suffix}` });
    expect(listed.societies[0]!.nearestMetro).toMatchObject({ name: STATION.name });
  });

  it('reports no station when the nearest open one is too far to walk', async () => {
    const far = await findSociety(sql, societySlug(COURT)!);
    expect(far!.nearestMetro).toMatchObject({ name: STATION.name });

    await sql`UPDATE metro_stations SET status = 'upcoming' WHERE slug = ${STATION.slug}`;
    expect((await findSociety(sql, TOWERS_SLUG))!.nearestMetro).toBeNull();
    await sql`UPDATE metro_stations SET status = 'open' WHERE slug = ${STATION.slug}`;
  });

  it('breaks rent down by bedroom count', async () => {
    const society = await findSociety(sql, TOWERS_SLUG);
    expect(society!.byBedrooms).toEqual([
      { bedrooms: 2, units: 2, rentMin: 30000, rentMedian: 35000, rentMax: 40000 },
      { bedrooms: 3, units: 1, rentMin: 60000, rentMedian: 60000, rentMax: 60000 },
    ]);
  });

  it('lists the units on the page, cheapest move-in first', async () => {
    const page = await societyListings(sql, TOWERS_SLUG, { sort: 'movein_asc' });
    expect(page!.total).toBe(3);
    expect(page!.pages).toBe(1);
    expect(page!.hits.map((h) => h.sourceUrl.split('/').pop())).toEqual(['s-2bhk-cheap', 's-2bhk', 's-3bhk']);
    expect(page!.hits[0]!.moveInCost).toMatchObject({ total: 210000, brokerage: 30000 });
    expect(page!.hits.every((h) => h.societySlug === TOWERS_SLUG)).toBe(true);
    expect(await societyListings(sql, 'zz-no-such-society')).toBeNull();
  });

  it('paginates and falls back to rent order for sorts that need a search centre', async () => {
    const page = await societyListings(sql, TOWERS_SLUG, { sort: 'distance', pageSize: 2 });
    expect(page!.sort).toBe('rent_asc');
    expect(page!.pages).toBe(2);
    expect(page!.hits.map((h) => h.rent)).toEqual([30000, 40000]);

    const second = await societyListings(sql, TOWERS_SLUG, { sort: 'relevance', pageSize: 2, page: 2 });
    expect(second!.hits.map((h) => h.rent)).toEqual([60000]);
  });

  it('finds apartments by name, ignoring unnamed listings', async () => {
    const found = await listSocieties(sql, { q: `Test Towers ${suffix}` });
    expect(found.societies.map((s) => s.slug)).toEqual([TOWERS_SLUG]);
    expect(found.societies[0]).toMatchObject({ units: 3, name: TOWERS });
    expect(found.total).toBe(1);

    const both = await listSocieties(sql, { q: suffix });
    expect(both.societies.map((s) => s.units)).toEqual([3, 1]);
    expect((await listSocieties(sql, { q: 'zz-nothing-matches-this' })).societies).toEqual([]);
  });

  it('offers apartment names for the search box, busiest first', async () => {
    const options = await societyOptions(sql, 10_000);
    const mine = options.filter((o) => o.name.includes(suffix));
    expect(mine).toEqual([
      { slug: TOWERS_SLUG, name: TOWERS, units: 3 },
      { slug: societySlug(COURT), name: COURT, units: 1 },
    ]);
    expect(options.findIndex((o) => o.slug === TOWERS_SLUG)).toBeLessThan(
      options.findIndex((o) => o.slug === societySlug(COURT)),
    );
    expect(await societyOptions(sql, 1)).toHaveLength(1);
  });
});
