import type { SocietyBedroomStat } from '@blr/db';
import { rupees, sizeLabel } from './format';

const COMMON_SIZES = [2, 3, 1];
const SIZES_IN_SUMMARY = 2;

const commonStats = (stats: SocietyBedroomStat[]): SocietyBedroomStat[] =>
  COMMON_SIZES.flatMap((size) => stats.filter((s) => s.bedrooms === size)).slice(0, SIZES_IN_SUMMARY);

export function areaRentSummary(stats: SocietyBedroomStat[]): string | null {
  const [first, second] = commonStats(stats);
  if (!first) return null;
  const lead = `A typical ${sizeLabel(first.bedrooms)} rents for about ${rupees(first.rentMedian)} a month`;
  return second ? `${lead}, and a ${sizeLabel(second.bedrooms)} for about ${rupees(second.rentMedian)}.` : `${lead}.`;
}

export function areaDescription(name: string, total: number, stats: SocietyBedroomStat[]): string {
  const [first] = commonStats(stats);
  const typical = first ? ` Typical ${sizeLabel(first.bedrooms)} rent ${rupees(first.rentMedian)}.` : '';
  const count = total > 0 ? `${total.toLocaleString('en-IN')} flats` : 'Flats';
  return `${count} and apartments for rent in ${name}, Bangalore, from NoBroker, MagicBricks and other portals.${typical} See the nearest metro and tech park for every listing.`;
}
