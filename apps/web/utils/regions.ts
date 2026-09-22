import type { LatLng } from '@blr/core';
import type { LocalityCoverage, LocalityMatch } from '@blr/db';

export type RegionKey = 'central' | 'east' | 'south' | 'north' | 'west';

export interface AreaOption {
  name: string;
  listings: number;
}

export interface Region {
  key: RegionKey;
  name: string;
  areas: AreaOption[];
}

export const REGION_NAMES: Record<RegionKey, string> = {
  central: 'Central',
  east: 'East',
  south: 'South',
  north: 'North',
  west: 'West',
};

const CITY_CENTRE: LatLng = { lat: 12.9757, lng: 77.6057 };
const CENTRAL_RADIUS_KM = 3.5;
const KM_PER_DEGREE = 111.2;
const SECTORS: [number, RegionKey][] = [
  [45, 'north'],
  [140, 'east'],
  [235, 'south'],
  [320, 'west'],
  [360, 'north'],
];

export function regionOf(point: LatLng): RegionKey {
  const north = (point.lat - CITY_CENTRE.lat) * KM_PER_DEGREE;
  const east = (point.lng - CITY_CENTRE.lng) * KM_PER_DEGREE * Math.cos((CITY_CENTRE.lat * Math.PI) / 180);
  if (Math.hypot(north, east) <= CENTRAL_RADIUS_KM) return 'central';
  const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  return SECTORS.find(([limit]) => bearing < limit)?.[1] ?? 'north';
}

const totalListings = (areas: AreaOption[]): number => areas.reduce((sum, a) => sum + a.listings, 0);

export function groupByRegion(localities: LocalityMatch[], coverage: LocalityCoverage[]): Region[] {
  const listingsById = new Map(coverage.map((c) => [c.id, c.listings]));
  const buckets = new Map<RegionKey, AreaOption[]>();
  for (const locality of localities) {
    const listings = listingsById.get(locality.id) ?? 0;
    if (listings === 0) continue;
    const key = regionOf(locality);
    const bucket = buckets.get(key) ?? [];
    bucket.push({ name: locality.name, listings });
    buckets.set(key, bucket);
  }
  return [...buckets]
    .map(([key, areas]) => ({
      key,
      name: REGION_NAMES[key],
      areas: areas.sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => totalListings(b.areas) - totalListings(a.areas));
}
