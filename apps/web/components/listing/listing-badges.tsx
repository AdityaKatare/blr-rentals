import type { SearchHit } from '@blr/db';
import { isNewListing } from '@/utils/format';

export function ListingBadges({ hit }: { hit: SearchHit }) {
  const active = hit.status === 'active';
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
      {!active && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium text-white">No longer listed</span>}
      {active && isNewListing(hit.postedAt) && (
        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white">New</span>
      )}
      {active && hit.rentDrop && (
        <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-medium text-white">Price dropped</span>
      )}
    </div>
  );
}
