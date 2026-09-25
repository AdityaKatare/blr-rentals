import type { Furnishing, PropertyType } from '@blr/core';
import type { SearchHit, SocietyBedroomStat } from '@blr/db';
import { SHORTLIST_INSIGHTS_MIN_HOMES, SHORTLIST_NEAR_METRO_M } from '@/constants/shortlist';

export interface Spread {
  low: number;
  median: number;
  high: number;
}

export interface Tally<K extends string = string> {
  key: K;
  count: number;
}

export interface ShortlistInsights {
  homes: number;
  rent: Spread;
  moveIn: (Spread & { known: number }) | null;
  ownerListed: number;
  nearMetro: number;
  unlocated: number;
  byBedrooms: SocietyBedroomStat[];
  areas: Tally[];
  furnishing: Tally<Furnishing>[];
  propertyTypes: Tally<PropertyType>[];
  rentCuts: number;
  cheaperElsewhere: number;
}

function spread(values: readonly number[]): Spread | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  return { low: sorted[0]!, median, high: sorted[sorted.length - 1]! };
}

function tally<K extends string>(keys: readonly K[]): Tally<K>[] {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function distinctActiveHomes(hits: readonly SearchHit[]): SearchHit[] {
  const homes = new Map<string, SearchHit>();
  for (const hit of hits) {
    if (hit.status !== 'active' || !Number.isFinite(hit.rent) || hit.rent <= 0) continue;
    const key = hit.propertyId ?? hit.id;
    const kept = homes.get(key);
    if (!kept || hit.rent < kept.rent) homes.set(key, hit);
  }
  return [...homes.values()];
}

function rentByBedrooms(homes: readonly SearchHit[]): SocietyBedroomStat[] {
  const rents = new Map<number, number[]>();
  for (const home of homes) {
    const group = rents.get(home.bedrooms) ?? [];
    group.push(home.rent);
    rents.set(home.bedrooms, group);
  }
  return [...rents]
    .sort(([a], [b]) => a - b)
    .map(([bedrooms, values]) => {
      const { low, median, high } = spread(values)!;
      return { bedrooms, units: values.length, rentMin: low, rentMedian: median, rentMax: high };
    });
}

const isPrecise = (hit: SearchHit): boolean => hit.geoAccuracy === 'exact' || hit.geoAccuracy === 'approximate';

export function summarizeShortlist(hits: readonly SearchHit[]): ShortlistInsights | null {
  const homes = distinctActiveHomes(hits);
  if (homes.length < SHORTLIST_INSIGHTS_MIN_HOMES) return null;

  const moveIns = homes.flatMap((h) => (h.moveInCost ? [h.moveInCost.total] : []));
  const moveIn = spread(moveIns);

  return {
    homes: homes.length,
    rent: spread(homes.map((h) => h.rent))!,
    moveIn: moveIn && { ...moveIn, known: moveIns.length },
    ownerListed: homes.filter((h) => h.listedBy === 'owner').length,
    nearMetro: homes.filter((h) => h.nearestMetro !== null && h.nearestMetro.distanceM <= SHORTLIST_NEAR_METRO_M).length,
    unlocated: homes.filter((h) => !isPrecise(h)).length,
    byBedrooms: rentByBedrooms(homes),
    areas: tally(homes.flatMap((h) => (h.locality?.trim() ? [h.locality.trim()] : []))),
    furnishing: tally(homes.flatMap((h) => (h.furnishing === 'unknown' ? [] : [h.furnishing]))),
    propertyTypes: tally(homes.map((h) => h.propertyType)),
    rentCuts: homes.filter((h) => h.rentDrop !== null).length,
    cheaperElsewhere: homes.filter((h) => h.otherListings.some((o) => o.rent < h.rent)).length,
  };
}
