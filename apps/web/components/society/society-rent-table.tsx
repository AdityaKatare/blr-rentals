import { formatBedrooms } from '@blr/core';
import type { SocietyBedroomStat } from '@blr/db';
import { rupees } from '@/utils/format';

export function SocietyRentTable({ stats }: { stats: SocietyBedroomStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">Size</th>
            <th className="px-4 py-2 font-medium">Live units</th>
            <th className="px-4 py-2 font-medium">Lowest</th>
            <th className="px-4 py-2 font-medium">Median</th>
            <th className="px-4 py-2 font-medium">Highest</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.bedrooms} className="border-t border-zinc-100">
              <th scope="row" className="px-4 py-2 text-left font-medium">
                {formatBedrooms({ bedrooms: s.bedrooms, is1rk: s.bedrooms === 0, bedroomsPlus: false })}
              </th>
              <td className="px-4 py-2 text-zinc-600">{s.units}</td>
              <td className="px-4 py-2 text-zinc-600">{rupees(s.rentMin)}</td>
              <td className="px-4 py-2 font-medium">{rupees(s.rentMedian)}</td>
              <td className="px-4 py-2 text-zinc-600">{rupees(s.rentMax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
