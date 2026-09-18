import { depositMonths } from '@blr/core';
import type { SearchHit } from '@blr/db';
import { rupees } from '@/utils/format';

export function ListingPrice({ hit }: { hit: SearchHit }) {
  const months = depositMonths(hit.rent, hit.deposit);
  const cost = hit.moveInCost;
  const breakdown = cost
    ? [
        `${rupees(cost.rent)} first month`,
        `${rupees(cost.deposit)} deposit`,
        cost.maintenance ? `${rupees(cost.maintenance)} maintenance` : null,
        cost.brokerage ? `${rupees(cost.brokerage)} brokerage, one month` : null,
      ]
        .filter(Boolean)
        .join(' + ')
    : null;

  return (
    <div className="min-w-0">
      <p className="text-xl font-semibold tracking-tight">
        {hit.rentDrop && <span className="mr-1.5 text-sm font-normal text-zinc-400 line-through">{rupees(hit.rentDrop.from)}</span>}
        {rupees(hit.rent)}
        <span className="text-sm font-normal text-zinc-500"> /month</span>
      </p>

      <dl className="mt-1 space-y-0.5 text-xs text-zinc-500">
        <Row label="Maintenance" value={hit.maintenance ? `${rupees(hit.maintenance)} /month` : null} />
        <Row
          label="Deposit"
          value={hit.deposit ? `${rupees(hit.deposit)}${months !== null ? ` · ${months} ${months === 1 ? 'month' : 'months'}` : ''}` : null}
        />
        <Row label="To move in" value={cost ? rupees(cost.total) : null} title={breakdown} strong />
      </dl>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string | null;
  title?: string | null;
  strong?: boolean;
}

function Row({ label, value, title, strong }: RowProps) {
  return (
    <div className="flex gap-1.5" title={title ?? undefined}>
      <dt>{label}</dt>
      <dd className={value === null ? 'text-zinc-400' : strong ? 'font-medium text-zinc-900' : 'font-medium text-zinc-700'}>
        {value ?? 'not listed'}
      </dd>
    </div>
  );
}
