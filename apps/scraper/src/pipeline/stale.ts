import type { SourceSlug } from '@blr/core';
import { refreshProperty } from '@blr/db';
import { resolveSourceId, type Sql } from './upsert';

export interface StaleOptions {
  source: SourceSlug;
  now?: Date;
  staleAfterDays?: number;
  removeAfterDays?: number;
}

export type StaleSummary =
  | { skipped: false; markedStale: number; markedRemoved: number }
  | { skipped: true; reason: string };

const DEFAULT_STALE_DAYS = 7;
const DEFAULT_REMOVE_DAYS = 21;

export async function markStale(sql: Sql, opts: StaleOptions): Promise<StaleSummary> {
  const now = (opts.now ?? new Date()).toISOString();
  const staleDays = opts.staleAfterDays ?? DEFAULT_STALE_DAYS;
  const removeDays = opts.removeAfterDays ?? DEFAULT_REMOVE_DAYS;
  if (!(removeDays > staleDays)) throw new Error('removeAfterDays must be greater than staleAfterDays');

  const sourceId = await resolveSourceId(sql, opts.source);

  const [latest] = await sql<{ status: string }[]>`
    SELECT status FROM scrape_runs
    WHERE source_id = ${sourceId} AND status <> 'running'
    ORDER BY started_at DESC LIMIT 1`;
  if (!latest) return { skipped: true, reason: 'no finished scrape runs for this source' };
  if (latest.status !== 'ok') return { skipped: true, reason: `latest run for ${opts.source} is ${latest.status}` };

  return sql.begin(async (txn) => {
    const tx = txn as unknown as Sql;
    const freshness = tx`GREATEST(last_seen_at, COALESCE(source_updated_at, last_seen_at))`;

    const removed = await tx<{ id: string; old: string; property_id: string | null }[]>`
      WITH target AS (
        SELECT id, status AS old FROM listings
        WHERE source_id = ${sourceId} AND status <> 'removed'
          AND ${freshness} < ${now}::timestamptz - make_interval(days => ${removeDays})
        FOR UPDATE
      )
      UPDATE listings l SET status = 'removed', removed_at = ${now}, updated_at = now()
      FROM target WHERE l.id = target.id
      RETURNING l.id, target.old, l.property_id`;

    const stale = await tx<{ id: string; old: string; property_id: string | null }[]>`
      WITH target AS (
        SELECT id, status AS old FROM listings
        WHERE source_id = ${sourceId} AND status = 'active'
          AND ${freshness} < ${now}::timestamptz - make_interval(days => ${staleDays})
        FOR UPDATE
      )
      UPDATE listings l SET status = 'stale', updated_at = now()
      FROM target WHERE l.id = target.id
      RETURNING l.id, target.old, l.property_id`;

    const rows = [
      ...removed.map((r) => ({ id: r.id, old: r.old, next: 'removed' })),
      ...stale.map((r) => ({ id: r.id, old: r.old, next: 'stale' })),
    ];
    for (const r of rows) {
      await tx`
        INSERT INTO listing_changes (listing_id, observed_at, field, old_value, new_value)
        VALUES (${r.id}, ${now}, 'status', ${JSON.stringify(r.old)}::jsonb, ${JSON.stringify(r.next)}::jsonb)`;
    }

    const properties = new Set([...removed, ...stale].map((r) => r.property_id).filter((p): p is string => p !== null));
    for (const p of properties) await refreshProperty(tx, p);

    return { skipped: false as const, markedStale: stale.length, markedRemoved: removed.length };
  });
}
