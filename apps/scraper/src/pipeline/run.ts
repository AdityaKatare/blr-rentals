import { NormalizedListingSchema, type NormalizedListing, type SourceSlug } from '@blr/core';
import type { Logger } from 'pino';
import { BlockedError, type HttpClient } from '../http/client';
import type { RobotsGate } from '../http/robots';
import type { ParsedPage, SearchArea, SourceAdapter } from '../sources/types';
import type { ListingStore, UpsertSummary } from './upsert';

export interface RunDeps {
  adapter: SourceAdapter;
  http: HttpClient;
  robots: RobotsGate;
  logger: Logger;
  /** Omit for dry runs / tests. */
  store?: ListingStore;
}

export interface RunOptions {
  area: SearchArea;
  maxPages?: number;
  /** Build URLs and check robots only; never fetch. */
  dryRun?: boolean;
}

export interface RunSummary {
  source: SourceSlug;
  areaSlug: string;
  status: 'ok' | 'partial' | 'failed';
  pagesPlanned: string[];
  pagesFetched: number;
  listingsSeen: number;
  parseFailures: number;
  normalized: NormalizedListing[];
  upsert?: UpsertSummary;
  errors: string[];
  blocked: boolean;
}

/**
 * Source-agnostic orchestration: for each page → robots check → fetch → parse →
 * normalize (Zod-validated) → upsert. Stops on the first block, robots refusal
 * or fetch failure; never retries a 403/406.
 *
 * TODO(M2): record a `scrape_runs` row (start/finish/status/counters) around this.
 */
export async function runScrape(deps: RunDeps, opts: RunOptions): Promise<RunSummary> {
  const { adapter, http, robots, logger } = deps;
  const { area, dryRun = false } = opts;
  const maxPages = Math.min(opts.maxPages ?? adapter.supports.maxPages, adapter.supports.maxPages);

  const summary: RunSummary = {
    source: adapter.slug,
    areaSlug: area.slug,
    status: 'ok',
    pagesPlanned: [],
    pagesFetched: 0,
    listingsSeen: 0,
    parseFailures: 0,
    normalized: [],
    errors: [],
    blocked: false,
  };

  if (adapter.transport !== 'http') {
    summary.status = 'failed';
    summary.errors.push(`${adapter.slug} needs transport "${adapter.transport}", which is not available yet (Phase 2)`);
    return summary;
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
      break;
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
      summary.errors.push(String(err));
      if (err instanceof BlockedError) {
        summary.blocked = true;
        summary.status = 'failed';
        logger.error({ url }, err.message);
      } else {
        summary.status = summary.pagesFetched > 0 ? 'partial' : 'failed';
        logger.error({ url, err: String(err) }, 'fetch failed');
      }
      break;
    }

    let parsed: ParsedPage;
    try {
      parsed = adapter.parseSearchPage(body, finalUrl);
    } catch (err) {
      summary.status = summary.pagesFetched > 1 ? 'partial' : 'failed';
      summary.errors.push(`parse: ${String(err)}`);
      logger.error({ url, err: String(err) }, 'page parse failed');
      break;
    }

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

    logger.info({ page, url, listings: parsed.raw.length, total: parsed.total ?? null }, 'page done');
    if (!parsed.hasNext) break;
  }

  if (summary.status === 'ok' && summary.listingsSeen > 0 && summary.parseFailures / summary.listingsSeen > 0.2) {
    summary.status = 'partial';
  }

  if (deps.store && !dryRun && summary.normalized.length > 0) {
    summary.upsert = await deps.store.upsertMany(summary.normalized);
  }

  return summary;
}
