import Link from 'next/link';
import type { ActiveFilter } from '@/utils/filters';

interface ActiveFilterChipsProps {
  chips: ActiveFilter[];
  clearAllHref: string;
}

export function ActiveFilterChips({ chips, clearAllHref }: ActiveFilterChipsProps) {
  if (chips.length === 0) return <span className="label">No filters</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label">Active</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          aria-label={`Remove filter ${c.label}`}
          className="inline-flex items-center gap-2 border border-rule bg-sheet px-2 py-1 text-[12px] hover:border-ink"
        >
          {c.label}
          <span aria-hidden className="text-muted">
            &#10005;
          </span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link href={clearAllHref} scroll={false} className="label underline underline-offset-4 hover:text-warn">
          Clear all
        </Link>
      )}
    </div>
  );
}
