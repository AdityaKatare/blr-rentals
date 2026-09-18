import type { SourceSlug } from '@blr/core';
import { SOURCE_LABELS } from '@/constants/labels';

export function SourceBadges({ sources }: { sources: SourceSlug[] }) {
  return (
    <p className="flex shrink-0 flex-wrap gap-2 font-mono text-[11px] text-muted">
      {sources.map((s) => (
        <span key={s} className="border border-rule px-2 py-0.5">
          {SOURCE_LABELS[s] ?? s}
        </span>
      ))}
    </p>
  );
}
