import type { SearchHit } from '@blr/db';
import { SOURCE_LABELS } from '@/constants/labels';
import { rupees } from '@/utils/format';

export function AlsoListed({ hit }: { hit: SearchHit }) {
  const others = hit.otherListings;
  if (others.length === 0) return null;
  const cheaperElsewhere = others.filter((o) => o.rent < hit.rent);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-zinc-500">{others.length === 1 ? 'Also listed' : `Also listed ${others.length} more times`}:</span>
      {others.map((o) => (
        <a
          key={o.id}
          href={o.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full border px-2 py-0.5 hover:border-zinc-400 ${o.rent < hit.rent ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-700'}`}
        >
          {SOURCE_LABELS[o.source] ?? o.source} {rupees(o.rent)} ↗
        </a>
      ))}
      {cheaperElsewhere.length > 0 && (
        <span className="text-emerald-700">{rupees(hit.rent - Math.min(...cheaperElsewhere.map((o) => o.rent)))} cheaper elsewhere</span>
      )}
    </div>
  );
}
