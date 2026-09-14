import type { SourceSlug } from '@blr/core';
import { resolveSourceId, type Sql } from './upsert';
import type { RunSummary } from './run';

export interface RunRecorder {
  start(source: SourceSlug, searchAreaId: number | null): Promise<number>;
  finish(runId: number, summary: RunSummary): Promise<void>;
}

export function createRunRecorder(sql: Sql): RunRecorder {
  return {
    async start(source, searchAreaId) {
      const sourceId = await resolveSourceId(sql, source);
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO scrape_runs (source_id, search_area_id) VALUES (${sourceId}, ${searchAreaId})
        RETURNING id`;
      return Number(row!.id);
    },

    async finish(runId, s) {
      const notes = [
        `pages ${s.pagesFetched}/${s.pagesPlanned.length}`,
        s.listingsSkipped ? `skipped ${s.listingsSkipped}` : null,
        s.blocked ? 'BLOCKED' : null,
      ]
        .filter(Boolean)
        .join('; ');
      await sql`
        UPDATE scrape_runs SET
          finished_at = now(),
          status = ${s.status}::run_status,
          pages_fetched = ${s.pagesFetched},
          listings_seen = ${s.listingsSeen},
          inserted = ${s.upsert?.inserted ?? 0},
          updated = ${s.upsert?.updated ?? 0},
          unchanged = ${s.upsert?.unchanged ?? 0},
          parse_failures = ${s.parseFailures},
          http_errors = ${s.httpErrors},
          error_sample = ${JSON.stringify(s.errors.slice(0, 5))}::jsonb,
          notes = ${notes}
        WHERE id = ${runId}`;
    },
  };
}
