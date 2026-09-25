import { formatBedrooms } from '@blr/core';
import type { SocietyBedroomStat } from '@blr/db';
import { TABLE, TABLE_HEAD, TABLE_WRAP, TD, TD_NUM, TH } from '@/components/ui/data-table';
import { rupees } from '@/utils/format';

export function SocietyRentTable({
  stats,
  unitsLabel = 'Live units',
}: {
  stats: SocietyBedroomStat[];
  unitsLabel?: string;
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
          {stats.map((s) => (
            <tr key={s.bedrooms}>
              <th scope="row" className={`${TD} text-left font-medium`}>
                {formatBedrooms({ bedrooms: s.bedrooms, is1rk: s.bedrooms === 0, bedroomsPlus: false })}
              </th>
              <td className={TD_NUM}>{s.units}</td>
              <td className={TD_NUM}>{rupees(s.rentMin)}</td>
              <td className={`${TD_NUM} font-medium text-ink`}>{rupees(s.rentMedian)}</td>
              <td className={TD_NUM}>{rupees(s.rentMax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
