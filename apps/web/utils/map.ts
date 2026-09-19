import { formatBedrooms } from '@blr/core';
import type { SearchHit, SearchResult } from '@blr/db';
import { COORD_DECIMALS } from '@/constants/map';
import { rupees, shortRupees } from './format';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  accuracy: 'exact' | 'approximate';
}

export function pinsFromHits(hits: SearchHit[]): { pins: MapPin[]; approxOnly: number } {
  const pins: MapPin[] = [];
  let approxOnly = 0;
  for (const hit of hits) {
    if (hit.lat === null || hit.lng === null) continue;
    if (hit.geoAccuracy === 'locality_centroid') {
      approxOnly += 1;
      continue;
    }
    pins.push({
      id: hit.id,
      lat: hit.lat,
      lng: hit.lng,
      label: shortRupees(hit.rent),
      title: [rupees(hit.rent), formatBedrooms(hit), hit.locality].filter(Boolean).join(' · '),
      accuracy: hit.geoAccuracy === 'exact' ? 'exact' : 'approximate',
    });
  }
  return { pins, approxOnly };
}

export const formatCoord = (n: number): string => n.toFixed(COORD_DECIMALS);

export function centerLabel(center: SearchResult['center']): string {
  if (center.locality) return center.locality.name;
  if (center.nearest) return `pin near ${center.nearest.name}`;
  return `${formatCoord(center.lat)}, ${formatCoord(center.lng)}`;
}
