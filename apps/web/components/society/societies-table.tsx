import type { SocietySummary } from '@blr/db';
import Link from 'next/link';
import { SOURCE_LABELS } from '@/constants/labels';
import { TABLE, TABLE_HEAD, TABLE_WRAP, TD, TD_NUM, TH } from '@/components/ui/data-table';
import { rupees } from '@/utils/format';
import { NearestMetroLabel } from './nearest-metro';

export function SocietiesTable({ societies }: { societies: SocietySummary[] }) {
  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE}>
        <thead className={TABLE_HEAD}>
          <tr>
            <th className={TH}>Apartment</th>
            <th className={TH}>Units</th>
            <th className={TH}>Rent</th>
            <th className={TH}>Locality</th>
            <th className={TH}>Metro</th>
            <th className={TH}>Sources</th>
          </tr>
        </thead>
        <tbody>
          {societies.map((society) => (
            <tr key={society.slug} className="hover:bg-shade">
              <th scope="row" className={`${TD} text-left font-medium`}>
                <Link href={`/societies/${society.slug}`} className="underline decoration-rule underline-offset-4 hover:decoration-ink">
                  {society.name}
                </Link>
              </th>
              <td className={TD_NUM}>{society.units}</td>
              <td className={TD_NUM}>
                {society.rentMin === society.rentMax ? rupees(society.rentMin) : `${rupees(society.rentMin)} - ${rupees(society.rentMax)}`}
              </td>
              <td className={TD}>{society.locality ?? '—'}</td>
              <td className={`${TD} text-second`}>
                {society.nearestMetro ? <NearestMetroLabel metro={society.nearestMetro} /> : 'None within 3 km'}
              </td>
              <td className={`${TD} font-mono text-[11px] text-muted`}>
                {society.sources.map((s) => SOURCE_LABELS[s] ?? s).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
