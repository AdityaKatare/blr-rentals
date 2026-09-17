import { NormalizedListingSchema, type NormalizedListing, type SourceSlug } from '@blr/core';
import type { DedupeSummary, ListingStore, RunRecorder, RunStatus, UpsertSummary } from '@blr/db';
import type { Logger } from 'pino';
import { BlockedError, HttpError } from '../errors';
import type { HttpClient } from '../http/client';
import type { RobotsGate } from '../http/robots';
import type { ParsedPage, SearchArea, SourceAdapter } from '../sources/types';

const PARTIAL_RUN_PARSE_FAILURE_RATE = 0.2;

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
  slices?: readonly string[];
  dryRun?: boolean;
}

export interface RunSummary {
  runId: number | null;
  source: SourceSlug;
  areaSlug: string;
  status: RunStatus;
  pagesPlanned: string[];
  pagesFetched: number;
  listingsSeen: number;
  listingsSkipped: number;
  emptySlices: string[];
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
    emptySlices: [],
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
  const { adapter } = deps;
  const maxPages = Math.min(opts.maxPages ?? adapter.supports.maxPages, adapter.supports.maxPages);

  if (adapter.transport !== 'http') {
    summary.status = 'failed';
    summary.errors.push(`${adapter.slug} needs transport "${adapter.transport}", which is not available yet (Phase 2)`);
    return;
  }

  const slices = opts.slices ?? adapter.slices;
  const unknown = slices.filter((s) => !adapter.slices.includes(s));
  if (unknown.length > 0) {
    summary.status = 'failed';
    summary.errors.push(`unknown ${adapter.slug} slices: ${unknown.join(', ')} (known: ${adapter.slices.join(', ')})`);
    return;
  }

  for (const slice of slices) {
    const outcome = await collectSlice(deps, opts, summary, slice, maxPages);
    if (outcome === 'abort') return;
  }

  if (summary.status === 'ok' && slices.length > 0 && summary.emptySlices.length === slices.length) {
    summary.status = 'failed';
    summary.errors.push(`${adapter.slug} has no search page for area "${opts.area.slug}"; check its source override`);
  }

  if (summary.status === 'ok' && summary.listingsSeen > 0 && summary.parseFailures / summary.listingsSeen > PARTIAL_RUN_PARSE_FAILURE_RATE) {
    summary.status = 'partial';
  }
}

async function collectSlice(
  deps: RunDeps,
  opts: RunOptions,
  summary: RunSummary,
  slice: string,
  maxPages: number,
): Promise<'done' | 'abort'> {
  const { adapter, http, robots, logger } = deps;
  const { area, dryRun = false } = opts;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = adapter.buildSearchUrl(area, page, slice);
    summary.pagesPlanned.push(url);

    try {
      await robots.assertAllowed(url);
    } catch (err) {
      summary.status = 'failed';
      summary.errors.push(String(err));
      logger.error({ url, err: String(err) }, 'robots check failed');
      return 'abort';
    }

    if (dryRun) {
      logger.info({ url, slice, page }, 'dry-run: would fetch');
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
      if (err instanceof HttpError && !(err instanceof BlockedError) && err.status === 404 && page === 1) {
        summary.emptySlices.push(slice);
        logger.warn({ url, slice }, 'no search page for this slice');
        return 'done';
      }
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
      return 'abort';
    }

    let parsed: ParsedPage;
    try {
      parsed = adapter.parseSearchPage(body, finalUrl);
    } catch (err) {
      summary.status = summary.pagesFetched > 1 ? 'partial' : 'failed';
      summary.errors.push(`parse: ${String(err)}`);
      logger.error({ url, err: String(err) }, 'page parse failed');
      return 'abort';
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
      { slice, page, listings: parsed.raw.length, skipped: parsed.skipped ?? 0, total: parsed.total ?? null },
      'page done',
    );
    if (!parsed.hasNext) break;
  }
  return 'done';
}
