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
      <p className="tabular font-display text-[28px] leading-none @3xl:text-[32px]">
        {hit.rentDrop && (
          <span className="mr-2 font-sans text-[14px] text-muted line-through">{rupees(hit.rentDrop.from)}</span>
        )}
        {rupees(hit.rent)}
        <span className="font-sans text-[13px] text-muted"> /mo</span>
      </p>

      <dl className="tabular mt-3 font-mono text-[11px] leading-[1.8]">
        <Row label="Maint" value={hit.maintenance ? `${rupees(hit.maintenance)} /mo` : null} />
        <Row
          label="Deposit"
          value={hit.deposit ? `${rupees(hit.deposit)}${months !== null ? ` · ${months} mo` : ''}` : null}
        />
        <Row label="Move in" value={cost ? rupees(cost.total) : null} title={breakdown} strong />
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
  const emphasis = value === null ? 'text-muted' : strong ? 'font-medium' : '';
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 tracking-[0.08em] text-muted uppercase">{label}</dt>
      <dd
        title={title ?? undefined}
        className={`${emphasis} ${strong && value ? 'border-b border-dotted border-ink' : ''}`}
      >
        {value ?? 'not listed'}
      </dd>
    </div>
  );
}
