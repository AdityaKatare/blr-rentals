import type { SocietySummary } from '@blr/db';
import Link from 'next/link';
import { SourceBadges } from '@/components/listing/source-badges';
import { rupees } from '@/utils/format';
import { NearestMetroLabel } from './nearest-metro';

export function SocietySummaryCard({ society }: { society: SocietySummary }) {
  const range = society.rentMin === society.rentMax ? rupees(society.rentMin) : `${rupees(society.rentMin)} – ${rupees(society.rentMax)}`;

  return (
    <Link
      href={`/societies/${society.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{society.name}</p>
        <p className="text-sm text-zinc-600">
          {society.units} {society.units === 1 ? 'unit' : 'units'} · {range}
          {society.locality ? ` · ${society.locality}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {society.nearestMetro ? <NearestMetroLabel metro={society.nearestMetro} /> : 'No open metro station within 3 km'}
        </p>
      </div>
      <SourceBadges sources={society.sources} />
    </Link>
  );
}
