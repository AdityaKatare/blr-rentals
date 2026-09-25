import type { SocietyBedroomStat } from '@blr/db';
import Link from 'next/link';
import { TABLE, TABLE_HEAD, TABLE_WRAP, TD, TD_NUM, TH } from '@/components/ui/data-table';
import { rupees, sizeLabel } from '@/utils/format';

export function SocietyRentTable({
  stats,
  unitsLabel = 'Live units',
  sizeHref,
  activeBedrooms = null,
}: {
  stats: SocietyBedroomStat[];
  unitsLabel?: string;
  sizeHref?: (bedrooms: number) => string;
  activeBedrooms?: number | null;
}) {
  if (stats.length === 0) return null;
  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE}>
        <thead className={TABLE_HEAD}>
          <tr>
            <th className={TH}>Size</th>
            <th className={TH}>{unitsLabel}</th>
            <th className={TH}>Lowest</th>
            <th className={TH}>Median</th>
            <th className={TH}>Highest</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => {
            const label = sizeLabel(s.bedrooms);
            const active = s.bedrooms === activeBedrooms;
            return (
              <tr key={s.bedrooms} className={active ? 'bg-shade' : undefined}>
                <th scope="row" className={`${TD} text-left font-medium`}>
                  {sizeHref ? (
                    <Link
                      href={sizeHref(s.bedrooms)}
                      scroll={false}
                      aria-current={active ? 'true' : undefined}
                      aria-label={active ? `${label}. Show all sizes` : `Show only ${label}`}
                      className={`-mx-3 -my-2 block px-3 py-2 underline underline-offset-4 hover:decoration-ink ${active ? 'decoration-ink' : 'decoration-rule'}`}
                    >
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </th>
                <td className={TD_NUM}>{s.units}</td>
                <td className={TD_NUM}>{rupees(s.rentMin)}</td>
                <td className={`${TD_NUM} font-medium text-ink`}>{rupees(s.rentMedian)}</td>
                <td className={TD_NUM}>{rupees(s.rentMax)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
