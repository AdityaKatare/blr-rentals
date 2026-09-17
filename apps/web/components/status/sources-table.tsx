import type { SourceOverview } from '@blr/db';

export function SourcesTable({ sources }: { sources: SourceOverview[] }) {
  return (
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
          {sources.map((s) => (
            <tr key={s.slug}>
              <td className="border-b p-2 font-medium">{s.slug}</td>
              <td className="border-b p-2">{s.enabled ? 'yes' : 'no'}</td>
              <td className="border-b p-2">{s.transport}</td>
              <td className="border-b p-2">{s.crawlIntervalMin}</td>
              <td className="border-b p-2">{s.activeListings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
