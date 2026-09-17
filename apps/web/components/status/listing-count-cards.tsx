import type { ListingCounts } from '@blr/db';

export function ListingCountCards({ counts }: { counts: ListingCounts }) {
  const cards: Array<[string, number]> = [
    ['Active listings', counts.activeListings],
    ['Distinct homes', counts.homes],
    ['Homes listed more than once', counts.groupedHomes],
    ['Awaiting dedupe', counts.ungrouped],
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      ))}
    </section>
  );
}
