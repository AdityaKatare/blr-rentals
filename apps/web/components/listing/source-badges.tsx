import type { SourceSlug } from '@blr/core';
import { SOURCE_LABELS, SOURCE_STYLES } from '@/constants/labels';

export function SourceBadges({ sources }: { sources: SourceSlug[] }) {
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      {sources.map((s) => (
        <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_STYLES[s] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200'}`}>
          {SOURCE_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  );
}
