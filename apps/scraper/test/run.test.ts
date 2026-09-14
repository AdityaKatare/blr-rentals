import { readFileSync } from 'node:fs';
import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../src/http/client';
import type { RobotsGate } from '../src/http/robots';
import { runScrape } from '../src/pipeline/run';
import type { ListingStore } from '../src/pipeline/upsert';
import { nobrokerAdapter } from '../src/sources/nobroker/adapter';

const html = readFileSync(new URL('./fixtures/nobroker-search.html', import.meta.url), 'utf8');
const area = { id: 1, slug: 'koramangala', name: 'Koramangala', center: { lat: 12.9352, lng: 77.6245 }, radiusKm: 3, sourceOverrides: {} };

const http: HttpClient = {
  get: vi.fn(async (url: string) => ({ url, finalUrl: url, status: 200, body: html, headers: new Headers(), elapsedMs: 1, attempts: 1 })),
} as unknown as HttpClient;
const robots: RobotsGate = { isAllowed: async () => true, assertAllowed: async () => undefined, invalidate: () => undefined };
const logger = pino({ level: 'silent' });

describe('runScrape', () => {
  it('dedupes exactly the listings the store inserted or changed', async () => {
    const store: ListingStore = {
      upsertMany: vi.fn(async () => ({ inserted: 1, updated: 1, unchanged: 4, changes: 1, touchedIds: ['a', 'b'] })),
    };
    const dedupe = vi.fn(async () => ({ examined: 2, grouped: 0, created: 2, moved: 0, unchanged: 0, propertiesRemoved: 0 }));

    const summary = await runScrape({ adapter: nobrokerAdapter, http, robots, logger, store, dedupe }, { area, maxPages: 1 });

    expect(summary.status).toBe('ok');
    expect(summary.listingsSeen).toBe(6);
    expect(dedupe).toHaveBeenCalledWith(['a', 'b']);
    expect(summary.dedupe).toMatchObject({ examined: 2 });
  });

  it('skips dedupe when nothing changed', async () => {
    const store: ListingStore = {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, unchanged: 6, changes: 0, touchedIds: [] })),
    };
    const dedupe = vi.fn();
    await runScrape({ adapter: nobrokerAdapter, http, robots, logger, store, dedupe }, { area, maxPages: 1 });
    expect(dedupe).not.toHaveBeenCalled();
  });
});
