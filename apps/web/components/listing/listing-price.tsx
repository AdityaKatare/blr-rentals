import type { SearchHit } from '@blr/db';
import { rupees } from '@/utils/format';

export function ListingPrice({ hit }: { hit: SearchHit }) {
  return (
    <div className="min-w-0">
      <p className="text-xl font-semibold tracking-tight">
        {hit.rentDrop && <span className="mr-1.5 text-sm font-normal text-zinc-400 line-through">{rupees(hit.rentDrop.from)}</span>}
        {rupees(hit.rent)}
        <span className="text-sm font-normal text-zinc-500"> /month</span>
      </p>
      <p className="text-xs text-zinc-500">
        {hit.maintenance ? (
          <>
            <span className="font-medium text-zinc-700">{rupees(hit.rent + hit.maintenance)} total</span> incl. {rupees(hit.maintenance)} maintenance
          </>
        ) : (
          'Maintenance not listed'
        )}
        {' · '}
        {hit.deposit ? `Deposit ${rupees(hit.deposit)}` : 'Deposit not listed'}
      </p>
    </div>
  );
}
