import type { RecentRun } from '@blr/db';
import { TABLE, TABLE_HEAD, TABLE_WRAP, TD, TD_NUM, TH } from '@/components/ui/data-table';

const COLUMNS = ['id', 'source', 'area', 'status', 'started', 'pages', 'seen', 'new', 'updated', 'parse fails', 'http errors'];

export function RecentRunsTable({ runs }: { runs: RecentRun[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-[22px] leading-none">Recent scrape runs</h2>
      {runs.length === 0 ? (
        <p className="text-[13px] text-second">No runs yet.</p>
      ) : (
        <div className={TABLE_WRAP}>
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} className={TH}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className={TD_NUM}>{r.id}</td>
                  <td className={TD}>{r.source}</td>
                  <td className={TD}>{r.area ?? '—'}</td>
                  <td className={TD}>{r.status}</td>
                  <td className={TD_NUM}>{new Date(r.startedAt).toLocaleString('en-IN')}</td>
                  <td className={TD_NUM}>{r.pagesFetched}</td>
                  <td className={TD_NUM}>{r.listingsSeen}</td>
                  <td className={TD_NUM}>{r.inserted}</td>
                  <td className={TD_NUM}>{r.updated}</td>
                  <td className={TD_NUM}>{r.parseFailures}</td>
                  <td className={TD_NUM}>{r.httpErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
