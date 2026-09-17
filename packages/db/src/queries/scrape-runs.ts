import type { Sql } from '../client';
import type { RecentRun, RunRecorder } from '../types';
import { resolveSourceId } from './sources';

export function createRunRecorder(sql: Sql): RunRecorder {
  return {
    async start(source, searchAreaId) {
      const sourceId = await resolveSourceId(sql, source);
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO scrape_runs (source_id, search_area_id) VALUES (${sourceId}, ${searchAreaId})
        RETURNING id`;
      return Number(row!.id);
    },

    async finish(runId, run) {
      const notes = [
        `pages ${run.pagesFetched}/${run.pagesPlanned.length}`,
        run.listingsSkipped ? `skipped ${run.listingsSkipped}` : null,
        run.emptySlices.length ? `no page: ${run.emptySlices.join(',')}` : null,
        run.blocked ? 'BLOCKED' : null,
      ]
        .filter(Boolean)
        .join('; ');
      await sql`
        UPDATE scrape_runs SET
          finished_at = now(),
          status = ${run.status}::run_status,
          pages_fetched = ${run.pagesFetched},
          listings_seen = ${run.listingsSeen},
          inserted = ${run.upsert?.inserted ?? 0},
          updated = ${run.upsert?.updated ?? 0},
          unchanged = ${run.upsert?.unchanged ?? 0},
          parse_failures = ${run.parseFailures},
          http_errors = ${run.httpErrors},
          error_sample = ${JSON.stringify(run.errors.slice(0, 5))}::jsonb,
          notes = ${notes}
        WHERE id = ${runId}`;
    },
  };
}

export async function recentRuns(sql: Sql, limit: number): Promise<RecentRun[]> {
  return sql<RecentRun[]>`
    SELECT r.id::int AS id, s.slug AS source, a.slug AS area, r.status, r.started_at AS "startedAt", r.finished_at AS "finishedAt",
           r.pages_fetched AS "pagesFetched", r.listings_seen AS "listingsSeen", r.inserted, r.updated,
           r.parse_failures AS "parseFailures", r.http_errors AS "httpErrors"
    FROM scrape_runs r
    JOIN sources s ON s.id = r.source_id
    LEFT JOIN search_areas a ON a.id = r.search_area_id
    ORDER BY r.started_at DESC
    LIMIT ${limit}`;
}
