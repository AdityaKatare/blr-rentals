import type { SourceOverview } from '@blr/db';
import { TABLE, TABLE_HEAD, TABLE_WRAP, TD, TD_NUM, TH } from '@/components/ui/data-table';

export function SourcesTable({ sources }: { sources: SourceOverview[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-[22px] leading-none">Sources</h2>
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead className={TABLE_HEAD}>
            <tr>
              <th className={TH}>Source</th>
              <th className={TH}>Enabled</th>
              <th className={TH}>Transport</th>
              <th className={TH}>Interval (min)</th>
              <th className={TH}>Active listings</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.slug}>
                <th scope="row" className={`${TD} text-left font-medium`}>
                  {s.slug}
                </th>
                <td className={TD}>{s.enabled ? 'yes' : 'no'}</td>
                <td className={TD}>{s.transport}</td>
                <td className={TD_NUM}>{s.crawlIntervalMin}</td>
                <td className={TD_NUM}>{s.activeListings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
