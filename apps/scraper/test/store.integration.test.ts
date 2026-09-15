import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { NormalizedListingSchema, type NormalizedListing, type SourceSlug } from '@blr/core';
import { createDb, loadEnv, type DbHandle } from '@blr/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRunRecorder } from '../src/pipeline/runs';
import type { RunSummary } from '../src/pipeline/run';
import { markStale } from '../src/pipeline/stale';
import { createListingStore } from '../src/pipeline/upsert';
import { nobrokerAdapter } from '../src/sources/nobroker/adapter';
import { parseNobrokerSearchPage } from '../src/sources/nobroker/parse';

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
const slug = `zz-test-${randomBytes(4).toString('hex')}` as SourceSlug;

function fixtureListings(): NormalizedListing[] {
  const html = readFileSync(new URL('./fixtures/nobroker-search.html', import.meta.url), 'utf8');
  const area = { id: null, slug: 'koramangala', name: 'Koramangala', center: { lat: 12.9352, lng: 77.6245 }, radiusKm: 3, sourceOverrides: {} };
  return parseNobrokerSearchPage(html, 'u').raw.map((raw) => ({
    ...NormalizedListingSchema.parse(nobrokerAdapter.normalize(raw, { area, pageUrl: 'u', fetchedAt: new Date() })),
    source: slug,
  }));
}

function okSummary(): RunSummary {
  return {
    runId: null,
    source: slug,
    areaSlug: 'koramangala',
    status: 'ok',
    pagesPlanned: ['u'],
    pagesFetched: 1,
    emptySlices: [],
    listingsSeen: 6,
    listingsSkipped: 2,
    parseFailures: 0,
    httpErrors: 0,
    normalized: [],
    errors: [],
    blocked: false,
  };
}

describe.runIf(handle)('listing store against Postgres', () => {
  const sql = handle!.sql;
  let sourceId: number;

  beforeAll(async () => {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO sources (slug, name, base_url, enabled) VALUES (${slug}, 'integration test', 'https://example.com', false)
      RETURNING id`;
    sourceId = row!.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM scrape_runs WHERE source_id = ${sourceId}`;
    await sql`DELETE FROM listings WHERE source_id = ${sourceId}`;
    await sql`DELETE FROM sources WHERE id = ${sourceId}`;
    await handle!.close();
  });

  it('inserts, then touches unchanged listings, then records tracked changes', async () => {
    const store = createListingStore(sql);
    const listings = fixtureListings();

    const first = await store.upsertMany([...listings, listings[0]!]);
    expect(first).toMatchObject({ inserted: listings.length, updated: 0, unchanged: 0, changes: 0 });

    const [geo] = await sql<{ lat: number; lng: number; amenities: string[]; images: unknown[] }[]>`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, amenities, images
      FROM listings WHERE source_id = ${sourceId} AND source_listing_id = ${listings[0]!.sourceListingId}`;
    expect(geo!.lat).toBeCloseTo(listings[0]!.lat!, 6);
    expect(geo!.lng).toBeCloseTo(listings[0]!.lng!, 6);
    expect(geo!.amenities).toEqual(listings[0]!.amenities);
    expect(geo!.images).toEqual(listings[0]!.images);

    const second = await store.upsertMany(listings);
    expect(second).toMatchObject({ inserted: 0, updated: 0, unchanged: listings.length, changes: 0 });

    const bumped = listings.map((l, i) => (i === 0 ? { ...l, rent: l.rent + 1000, title: `${l.title} (new)` } : l));
    const third = await store.upsertMany(bumped);
    expect(third).toMatchObject({ inserted: 0, updated: 1, unchanged: listings.length - 1, changes: 1 });

    const changes = await sql<{ field: string; old_value: number; new_value: number }[]>`
      SELECT c.field, c.old_value, c.new_value FROM listing_changes c
      JOIN listings l ON l.id = c.listing_id
      WHERE l.source_id = ${sourceId}`;
    expect(changes).toEqual([{ field: 'rent', old_value: listings[0]!.rent, new_value: listings[0]!.rent + 1000 }]);
  });

  it('refuses to expire listings unless the latest run succeeded', async () => {
    const recorder = createRunRecorder(sql);
    const future = new Date(Date.now() + 10 * 86_400_000);

    expect(await markStale(sql, { source: slug, now: future })).toEqual({
      skipped: true,
      reason: 'no finished scrape runs for this source',
    });

    const failedRun = await recorder.start(slug, null);
    await recorder.finish(failedRun, { ...okSummary(), status: 'failed', blocked: true, errors: ['blocked'] });
    expect(await markStale(sql, { source: slug, now: future })).toMatchObject({ skipped: true });

    const okRun = await recorder.start(slug, null);
    await recorder.finish(okRun, okSummary());
    const [run] = await sql<{ status: string; listings_seen: number; notes: string }[]>`
      SELECT status, listings_seen, notes FROM scrape_runs WHERE id = ${okRun}`;
    expect(run).toEqual({ status: 'ok', listings_seen: 6, notes: 'pages 1/1; skipped 2' });

    const count = (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM listings WHERE source_id = ${sourceId}`)[0]!.n;
    const soon = await markStale(sql, { source: slug, now: new Date(Date.now() + 86_400_000) });
    expect(soon).toEqual({ skipped: false, markedStale: 0, markedRemoved: 0 });

    const stale = await markStale(sql, { source: slug, now: future, staleAfterDays: 7, removeAfterDays: 21 });
    expect(stale).toEqual({ skipped: false, markedStale: count, markedRemoved: 0 });

    const removed = await markStale(sql, { source: slug, now: new Date(Date.now() + 30 * 86_400_000) });
    expect(removed).toEqual({ skipped: false, markedStale: 0, markedRemoved: count });
  });

  it('reactivates a removed listing when it is seen again', async () => {
    const store = createListingStore(sql);
    const [first] = fixtureListings();
    const result = await store.upsertMany([first!]);
    expect(result).toMatchObject({ updated: 1, changes: 2 });
    const [row] = await sql<{ status: string; removed_at: Date | null }[]>`
      SELECT status, removed_at FROM listings WHERE source_id = ${sourceId} AND source_listing_id = ${first!.sourceListingId}`;
    expect(row).toEqual({ status: 'active', removed_at: null });
  });
});
