import Link from 'next/link';
import type { ActiveFilter } from '@/utils/filters';

interface ActiveFilterChipsProps {
  chips: ActiveFilter[];
  clearAllHref: string;
}

export function ActiveFilterChips({ chips, clearAllHref }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          aria-label={`Remove filter ${c.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white py-0.5 pl-2.5 pr-1.5 text-xs hover:border-zinc-500"
        >
          {c.label}
          <span aria-hidden className="text-zinc-400">
            ✕
          </span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link href={clearAllHref} scroll={false} className="px-1.5 text-xs text-zinc-600 underline underline-offset-2">
          Clear all
        </Link>
      )}
    </div>
  );
}
