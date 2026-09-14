import { NormalizedListingSchema, type NormalizedListing, type SourceSlug } from '@blr/core';
import type { DedupeSummary } from '@blr/db';
import type { Logger } from 'pino';
import { BlockedError, type HttpClient } from '../http/client';
import type { RobotsGate } from '../http/robots';
import type { ParsedPage, SearchArea, SourceAdapter } from '../sources/types';
import type { RunRecorder } from './runs';
import type { ListingStore, UpsertSummary } from './upsert';

export interface RunDeps {
  adapter: SourceAdapter;
  http: HttpClient;
  robots: RobotsGate;
  logger: Logger;
  store?: ListingStore;
  recorder?: RunRecorder;
  dedupe?: (listingIds: string[]) => Promise<DedupeSummary>;
}

export interface RunOptions {
  area: SearchArea;
  maxPages?: number;
  dryRun?: boolean;
}

export interface RunSummary {
  runId: number | null;
  source: SourceSlug;
  areaSlug: string;
  status: 'ok' | 'partial' | 'failed';
  pagesPlanned: string[];
  pagesFetched: number;
  listingsSeen: number;
  listingsSkipped: number;
  parseFailures: number;
  httpErrors: number;
  normalized: NormalizedListing[];
  upsert?: UpsertSummary;
  dedupe?: DedupeSummary;
  errors: string[];
  blocked: boolean;
}

export async function runScrape(deps: RunDeps, opts: RunOptions): Promise<RunSummary> {
  const { adapter, logger } = deps;
  const { area, dryRun = false } = opts;

  const summary: RunSummary = {
    runId: null,
    source: adapter.slug,
    areaSlug: area.slug,
    status: 'ok',
    pagesPlanned: [],
    pagesFetched: 0,
    listingsSeen: 0,
    listingsSkipped: 0,
    parseFailures: 0,
    httpErrors: 0,
    normalized: [],
    errors: [],
    blocked: false,
  };

  const recorder = dryRun ? undefined : deps.recorder;
  if (recorder) summary.runId = await recorder.start(adapter.slug, area.id);

  try {
    await collect(deps, opts, summary);
    if (deps.store && !dryRun && summary.normalized.length > 0) {
      summary.upsert = await deps.store.upsertMany(summary.normalized);
      if (deps.dedupe && summary.upsert.touchedIds.length > 0) {
        summary.dedupe = await deps.dedupe(summary.upsert.touchedIds);
      }
    }
  } catch (err) {
    summary.status = 'failed';
    summary.errors.push(`store: ${String(err).slice(0, 300)}`);
    logger.error({ err: String(err) }, 'run failed');
  } finally {
    if (recorder && summary.runId !== null) await recorder.finish(summary.runId, summary);
  }

  return summary;
}

async function collect(deps: RunDeps, opts: RunOptions, summary: RunSummary): Promise<void> {
  const { adapter, http, robots, logger } = deps;
  const { area, dryRun = false } = opts;
  const maxPages = Math.min(opts.maxPages ?? adapter.supports.maxPages, adapter.supports.maxPages);

  if (adapter.transport !== 'http') {
    summary.status = 'failed';
    summary.errors.push(`${adapter.slug} needs transport "${adapter.transport}", which is not available yet (Phase 2)`);
    return;
  }

  for (let page = 1; page <= maxPages; page += 1) {
    const url = adapter.buildSearchUrl(area, page);
    summary.pagesPlanned.push(url);

    try {
      await robots.assertAllowed(url);
    } catch (err) {
      summary.status = 'failed';
      summary.errors.push(String(err));
      logger.error({ url, err: String(err) }, 'robots check failed');
      return;
    }

    if (dryRun) {
      logger.info({ url, page }, 'dry-run: would fetch');
      continue;
    }

    let body: string;
    let finalUrl: string;
    try {
      const res = await http.get(url);
      body = res.body;
      finalUrl = res.finalUrl;
      summary.pagesFetched += 1;
    } catch (err) {
      summary.httpErrors += 1;
      summary.errors.push(String(err));
      if (err instanceof BlockedError) {
        summary.blocked = true;
        summary.status = 'failed';
        logger.error({ url }, err.message);
      } else {
        summary.status = summary.pagesFetched > 0 ? 'partial' : 'failed';
        logger.error({ url, err: String(err) }, 'fetch failed');
      }
      return;
    }

    let parsed: ParsedPage;
    try {
      parsed = adapter.parseSearchPage(body, finalUrl);
    } catch (err) {
      summary.status = summary.pagesFetched > 1 ? 'partial' : 'failed';
      summary.errors.push(`parse: ${String(err)}`);
      logger.error({ url, err: String(err) }, 'page parse failed');
      return;
    }

    summary.listingsSkipped += parsed.skipped ?? 0;
    for (const raw of parsed.raw) {
      summary.listingsSeen += 1;
      try {
        const listing = NormalizedListingSchema.parse(adapter.normalize(raw, { area, pageUrl: url, fetchedAt: new Date() }));
        summary.normalized.push(listing);
      } catch (err) {
        summary.parseFailures += 1;
        if (summary.errors.length < 5) summary.errors.push(`normalize: ${String(err).slice(0, 300)}`);
      }
    }

    logger.info(
      { page, listings: parsed.raw.length, skipped: parsed.skipped ?? 0, total: parsed.total ?? null },
      'page done',
    );
    if (!parsed.hasNext) break;
  }

  if (summary.status === 'ok' && summary.listingsSeen > 0 && summary.parseFailures / summary.listingsSeen > 0.2) {
    summary.status = 'partial';
  }
}
