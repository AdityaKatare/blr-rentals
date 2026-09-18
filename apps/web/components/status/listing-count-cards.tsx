import type { ListingCounts } from '@blr/db';

export function ListingCountCards({ counts }: { counts: ListingCounts }) {
  const cards: Array<[string, number]> = [
    ['Active listings', counts.activeListings],
    ['Distinct homes', counts.homes],
    ['Homes listed more than once', counts.groupedHomes],
    ['Awaiting dedupe', counts.ungrouped],
  ];
  return (
    <section className="grid grid-cols-2 border-t border-l border-ink sm:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="border-r border-b border-ink bg-sheet p-4">
          <p className="tabular font-display text-[32px] leading-none">{value.toLocaleString('en-IN')}</p>
          <p className="label mt-2">{label}</p>
        </div>
      ))}
    </section>
  );
}
