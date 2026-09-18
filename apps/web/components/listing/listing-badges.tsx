import type { SearchHit } from '@blr/db';
import { isNewListing } from '@/utils/format';

const BADGE = 'border border-ink px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase';

export function ListingBadges({ hit }: { hit: SearchHit }) {
  const active = hit.status === 'active';
  return (
    <div className="pointer-events-none absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
      {!active && <span className={`${BADGE} bg-ink text-paper`}>No longer listed</span>}
      {active && isNewListing(hit.postedAt) && <span className={`${BADGE} bg-ink text-paper`}>New</span>}
      {active && hit.rentDrop && <span className={`${BADGE} bg-paper text-ink`}>Price dropped</span>}
    </div>
  );
}
