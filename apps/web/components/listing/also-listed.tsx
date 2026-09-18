import type { SearchHit } from '@blr/db';
import { SOURCE_LABELS } from '@/constants/labels';
import { rupees } from '@/utils/format';

export function AlsoListed({ hit }: { hit: SearchHit }) {
  const others = hit.otherListings;
  if (others.length === 0) return null;
  const cheaperElsewhere = others.filter((o) => o.rent < hit.rent);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
      <span className="text-muted">{others.length === 1 ? 'Also listed' : `Also listed ${others.length} more times`}:</span>
      {others.map((o) => (
        <a
          key={o.id}
          href={o.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`border px-2 py-0.5 hover:bg-shade ${o.rent < hit.rent ? 'border-good text-good' : 'border-rule text-second'}`}
        >
          {SOURCE_LABELS[o.source] ?? o.source} {rupees(o.rent)} ↗
        </a>
      ))}
      {cheaperElsewhere.length > 0 && (
        <span className="text-good">{rupees(hit.rent - Math.min(...cheaperElsewhere.map((o) => o.rent)))} cheaper elsewhere</span>
      )}
    </p>
  );
}
