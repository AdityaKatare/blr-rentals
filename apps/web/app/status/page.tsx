import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RunRow {
  id: number;
  source: string;
  area: string | null;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  pages_fetched: number;
  listings_seen: number;
  inserted: number;
  updated: number;
  parse_failures: number;
  http_errors: number;
}

interface SourceRow {
  slug: string;
  enabled: boolean;
  transport: string;
  crawl_interval_min: number;
  active_listings: number;
}

async function load(): Promise<{ runs: RunRow[]; sources: SourceRow[] } | { error: string }> {
  try {
    const { sql } = getDb();
    const [runs, sources] = await Promise.all([
      sql<RunRow[]>`
        SELECT r.id, s.slug AS source, a.slug AS area, r.status, r.started_at, r.finished_at,
               r.pages_fetched, r.listings_seen, r.inserted, r.updated, r.parse_failures, r.http_errors
        FROM scrape_runs r
        JOIN sources s ON s.id = r.source_id
        LEFT JOIN search_areas a ON a.id = r.search_area_id
        ORDER BY r.started_at DESC
        LIMIT 30`,
      sql<SourceRow[]>`
        SELECT s.slug, s.enabled, s.transport::text AS transport, s.crawl_interval_min,
               (SELECT count(*)::int FROM listings l WHERE l.source_id = s.id AND l.status = 'active') AS active_listings
        FROM sources s
        ORDER BY s.id`,
    ]);
    return { runs, sources };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function StatusPage() {
  const data = await load();

  if ('error' in data) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-medium">Database unreachable</p>
        <p className="mt-1 text-zinc-700">{data.error}</p>
        <p className="mt-2 text-zinc-600">
          Start it with <code>pnpm db:up</code>, then <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-sm">
      <section>
        <h1 className="text-base font-semibold">Sources</h1>
        <table className="mt-2 w-full border-collapse bg-white">
          <thead className="text-left text-zinc-600">
            <tr>
              <th className="border-b p-2">source</th>
              <th className="border-b p-2">enabled</th>
              <th className="border-b p-2">transport</th>
              <th className="border-b p-2">interval (min)</th>
              <th className="border-b p-2">active listings</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.slug}>
                <td className="border-b p-2 font-medium">{s.slug}</td>
                <td className="border-b p-2">{s.enabled ? 'yes' : 'no'}</td>
                <td className="border-b p-2">{s.transport}</td>
                <td className="border-b p-2">{s.crawl_interval_min}</td>
                <td className="border-b p-2">{s.active_listings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-base font-semibold">Recent scrape runs</h2>
        {data.runs.length === 0 ? (
          <p className="mt-2 text-zinc-600">No runs yet.</p>
        ) : (
          <table className="mt-2 w-full border-collapse bg-white">
            <thead className="text-left text-zinc-600">
              <tr>
                <th className="border-b p-2">id</th>
                <th className="border-b p-2">source</th>
                <th className="border-b p-2">area</th>
                <th className="border-b p-2">status</th>
                <th className="border-b p-2">started</th>
                <th className="border-b p-2">pages</th>
                <th className="border-b p-2">seen</th>
                <th className="border-b p-2">new</th>
                <th className="border-b p-2">updated</th>
                <th className="border-b p-2">parse fails</th>
                <th className="border-b p-2">http errors</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((r) => (
                <tr key={r.id}>
                  <td className="border-b p-2">{r.id}</td>
                  <td className="border-b p-2">{r.source}</td>
                  <td className="border-b p-2">{r.area ?? '—'}</td>
                  <td className="border-b p-2">{r.status}</td>
                  <td className="border-b p-2">{new Date(r.started_at).toLocaleString('en-IN')}</td>
                  <td className="border-b p-2">{r.pages_fetched}</td>
                  <td className="border-b p-2">{r.listings_seen}</td>
                  <td className="border-b p-2">{r.inserted}</td>
                  <td className="border-b p-2">{r.updated}</td>
                  <td className="border-b p-2">{r.parse_failures}</td>
                  <td className="border-b p-2">{r.http_errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
