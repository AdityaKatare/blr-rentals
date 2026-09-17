import {
  createListingStore,
  createRunRecorder,
  dedupeListings,
  loadSearchArea,
  resolveSeedArea,
  type DbHandle,
} from '@blr/db';
import type { Command } from 'commander';
import type { ScraperConfig } from '../../config';
import { createHttpClient } from '../../http/client';
import { createRobotsGate, type RobotsGate } from '../../http/robots';
import { createLogger } from '../../log';
import { runScrape, type RunSummary } from '../../pipeline/run';
import { getAdapter, listAdapters } from '../../sources/registry';
import { positiveInt, runCommand, withDb } from '../run-command';

interface ScrapeOptions {
  source: string;
  area: string;
  pages?: string;
  slices?: string;
  dryRun: boolean;
  checkRobots: boolean;
}

const EXIT_UNKNOWN_AREA = 2;

export function registerScrapeCommand(program: Command): void {
  program
    .command('scrape')
    .description('Fetch one search area from one source')
    .requiredOption('--source <slug>', `one of: ${listAdapters().map((adapter) => adapter.slug).join(', ')}`)
    .requiredOption('--area <slug>', 'search area slug (packages/db/seeds/search_areas.json)')
    .option('--pages <n>', 'maximum pages per search slice; default: all the adapter supports')
    .option('--slices <list>', 'comma-separated search slices; default: all of them')
    .option('--dry-run', 'build the URLs only; no network unless --check-robots', false)
    .option('--check-robots', 'with --dry-run: fetch robots.txt and report the verdict', false)
    .action((options: ScrapeOptions) =>
      options.dryRun
        ? runCommand((config) => scrape(options, config, null))
        : withDb((db, config) => scrape(options, config, db)),
    );
}

async function scrape(options: ScrapeOptions, config: ScraperConfig, db: DbHandle | null): Promise<void> {
  const logger = createLogger(config.logLevel);
  const adapter = getAdapter(options.source);
  const area = db ? await loadSearchArea(db.sql, options.area) : await resolveSeedArea(options.area);
  if (!area) {
    logger.error({ area: options.area }, 'unknown or disabled search area');
    process.exitCode = EXIT_UNKNOWN_AREA;
    return;
  }

  const http = createHttpClient({
    userAgent: config.userAgent,
    minDelayMs: config.minDelayMs,
    jitterMs: config.jitterMs,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    logger,
  });
  const robots =
    options.dryRun && !options.checkRobots ? offlineRobotsGate() : createRobotsGate({ userAgent: config.userAgent, logger });

  const summary = await runScrape(
    {
      adapter,
      http,
      robots,
      logger,
      store: db ? createListingStore(db.sql) : undefined,
      recorder: db ? createRunRecorder(db.sql) : undefined,
      dedupe: db ? (listingIds: string[]) => dedupeListings(db.sql, { listingIds }) : undefined,
    },
    {
      area,
      maxPages: options.pages === undefined ? undefined : positiveInt(options.pages, 1),
      slices: parseSlices(options.slices),
      dryRun: options.dryRun,
    },
  );

  if (options.dryRun) printDryRun(summary, options.checkRobots);
  else printSummary(summary);
  if (summary.status === 'failed') process.exitCode = 1;
}

function parseSlices(value: string | undefined): string[] | undefined {
  return value
    ?.split(',')
    .map((slice) => slice.trim())
    .filter(Boolean);
}

function offlineRobotsGate(): RobotsGate {
  return {
    isAllowed: async () => true,
    assertAllowed: async () => undefined,
    invalidate: () => undefined,
  };
}

function printDryRun(summary: RunSummary, robotsChecked: boolean): void {
  console.log(summary.pagesPlanned.join('\n'));
  console.log(
    robotsChecked ? `robots: ${summary.status === 'ok' ? 'allowed' : 'REFUSED'}` : 'robots: not checked (add --check-robots)',
  );
}

function printSummary(summary: RunSummary): void {
  const { normalized, pagesPlanned, upsert, ...rest } = summary;
  const { touchedIds, ...upsertCounts } = upsert ?? { touchedIds: [] };
  console.log(
    JSON.stringify(
      { ...rest, pages: pagesPlanned.length, normalized: normalized.length, upsert: upsert ? upsertCounts : null },
      null,
      2,
    ),
  );
}
