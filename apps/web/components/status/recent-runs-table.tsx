import type { RecentRun } from '@blr/db';

export function RecentRunsTable({ runs }: { runs: RecentRun[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold">Recent scrape runs</h2>
      {runs.length === 0 ? (
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
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="border-b p-2">{r.id}</td>
                <td className="border-b p-2">{r.source}</td>
                <td className="border-b p-2">{r.area ?? '—'}</td>
                <td className="border-b p-2">{r.status}</td>
                <td className="border-b p-2">{new Date(r.startedAt).toLocaleString('en-IN')}</td>
                <td className="border-b p-2">{r.pagesFetched}</td>
                <td className="border-b p-2">{r.listingsSeen}</td>
                <td className="border-b p-2">{r.inserted}</td>
                <td className="border-b p-2">{r.updated}</td>
                <td className="border-b p-2">{r.parseFailures}</td>
                <td className="border-b p-2">{r.httpErrors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
