#!/usr/bin/env node
import { Command } from 'commander';
import { createDb, dedupeListings, resolveSeedArea, type DbHandle, type ResolvedSearchArea } from '@blr/db';
import { loadConfig } from './config';
import { NotImplementedError } from './errors';
import { createHttpClient } from './http/client';
import { createRobotsGate, type RobotsGate } from './http/robots';
import { createLogger } from './log';
import { runScrape } from './pipeline/run';
import { createRunRecorder } from './pipeline/runs';
import { markStale } from './pipeline/stale';
import { createListingStore } from './pipeline/upsert';
import { getAdapter, listAdapters } from './sources/registry';

const program = new Command();
program
  .name('blr-scraper')
  .description('Collects Bangalore rental listings from enabled sources into Postgres.')
  .version('0.1.0');

function offlineRobots(): RobotsGate {
  return {
    isAllowed: async () => true,
    assertAllowed: async () => undefined,
    invalidate: () => undefined,
  };
}

async function loadAreaFromDb(handle: DbHandle, slug: string): Promise<ResolvedSearchArea | null> {
  const rows = await handle.sql<
    { id: number; slug: string; name: string; lat: number; lng: number; radius_km: number; source_overrides: Record<string, Record<string, unknown>> | null }[]
  >`
    SELECT id, slug, name,
           ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lng,
           radius_km, source_overrides
    FROM search_areas
    WHERE slug = ${slug} AND enabled`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    center: { lat: Number(r.lat), lng: Number(r.lng) },
    radiusKm: Number(r.radius_km),
    sourceOverrides: r.source_overrides ?? {},
  };
}

function reportError(err: unknown): void {
  if (err instanceof NotImplementedError) {
    console.error(err.message);
    process.exitCode = 3;
    return;
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}

program
  .command('scrape')
  .description('Fetch one search area from one source')
  .requiredOption('--source <slug>', `one of: ${listAdapters().map((a) => a.slug).join(', ')}`)
  .requiredOption('--area <slug>', 'search area slug (packages/db/seeds/search_areas.json)')
  .option('--pages <n>', 'maximum pages per search slice; default: all the adapter supports')
  .option('--slices <list>', 'comma-separated search slices; default: all of them')
  .option('--dry-run', 'build the URLs only; no network unless --check-robots', false)
  .option('--check-robots', 'with --dry-run: fetch robots.txt and report the verdict', false)
  .action(async (o: { source: string; area: string; pages?: string; slices?: string; dryRun: boolean; checkRobots: boolean }) => {
    const config = loadConfig();
    const logger = createLogger(config.logLevel);
    const maxPages = o.pages === undefined ? undefined : Math.max(1, Number.parseInt(o.pages, 10) || 1);
    const slices = o.slices?.split(',').map((s) => s.trim()).filter(Boolean);
    let handle: DbHandle | null = null;
    try {
      const adapter = getAdapter(o.source);
      let area: ResolvedSearchArea | null;
      if (o.dryRun) {
        area = await resolveSeedArea(o.area);
      } else {
        handle = createDb(config.databaseUrl);
        area = await loadAreaFromDb(handle, o.area);
      }
      if (!area) {
        logger.error({ area: o.area }, 'unknown or disabled search area');
        process.exitCode = 2;
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
      const robots = o.dryRun && !o.checkRobots ? offlineRobots() : createRobotsGate({ userAgent: config.userAgent, logger });
      const store = handle ? createListingStore(handle.sql) : undefined;
      const recorder = handle ? createRunRecorder(handle.sql) : undefined;
      const db = handle;
      const dedupe = db ? (ids: string[]) => dedupeListings(db.sql, { listingIds: ids }) : undefined;

      const summary = await runScrape({ adapter, http, robots, logger, store, recorder, dedupe }, { area, maxPages, slices, dryRun: o.dryRun });
      if (o.dryRun) {
        console.log(summary.pagesPlanned.join('\n'));
        console.log(o.checkRobots ? `robots: ${summary.status === 'ok' ? 'allowed' : 'REFUSED'}` : 'robots: not checked (add --check-robots)');
      } else {
        const { normalized, pagesPlanned, upsert, ...rest } = summary;
        const { touchedIds, ...counts } = upsert ?? { touchedIds: [] };
        console.log(JSON.stringify({ ...rest, pages: pagesPlanned.length, normalized: normalized.length, upsert: upsert ? counts : null }, null, 2));
      }
      if (summary.status === 'failed') process.exitCode = 1;
    } catch (err) {
      reportError(err);
    } finally {
      await handle?.close();
    }
  });

program
  .command('status')
  .description('Show recent scrape runs')
  .option('--limit <n>', 'number of rows', '20')
  .action(async (o: { limit: string }) => {
    const config = loadConfig();
    let handle: DbHandle | null = null;
    try {
      handle = createDb(config.databaseUrl);
      const limit = Math.max(1, Number.parseInt(o.limit, 10) || 20);
      const rows = await handle.sql`
        SELECT r.id, s.slug AS source, a.slug AS area, r.status, r.started_at, r.finished_at,
               r.pages_fetched, r.listings_seen, r.inserted, r.updated, r.parse_failures, r.http_errors
        FROM scrape_runs r
        JOIN sources s ON s.id = r.source_id
        LEFT JOIN search_areas a ON a.id = r.search_area_id
        ORDER BY r.started_at DESC
        LIMIT ${limit}`;
      if (rows.length === 0) console.log('no runs yet');
      else console.table(rows);
    } catch (err) {
      reportError(err);
    } finally {
      await handle?.close();
    }
  });

program
  .command('mark-stale')
  .description('Transition listings active → stale → removed for a source')
  .requiredOption('--source <slug>')
  .option('--stale-days <n>', 'days without being seen or updated before a listing is hidden', '7')
  .option('--remove-days <n>', 'days without being seen or updated before a listing is removed', '21')
  .action(async (o: { source: string; staleDays: string; removeDays: string }) => {
    const config = loadConfig();
    let handle: DbHandle | null = null;
    try {
      handle = createDb(config.databaseUrl);
      const adapter = getAdapter(o.source);
      console.log(
        await markStale(handle.sql, {
          source: adapter.slug,
          staleAfterDays: Number(o.staleDays),
          removeAfterDays: Number(o.removeDays),
        }),
      );
    } catch (err) {
      reportError(err);
    } finally {
      await handle?.close();
    }
  });

program
  .command('dedupe')
  .description('Group all active listings that describe the same property')
  .action(async () => {
    const config = loadConfig();
    let handle: DbHandle | null = null;
    try {
      handle = createDb(config.databaseUrl);
      console.log(await dedupeListings(handle.sql));
    } catch (err) {
      reportError(err);
    } finally {
      await handle?.close();
    }
  });

program.parseAsync(process.argv).catch(reportError);
