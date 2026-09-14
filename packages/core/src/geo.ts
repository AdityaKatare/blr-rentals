export interface LatLng {
  lat: number;
  lng: number;
}

export const BENGALURU_BBOX = { minLat: 12.7, maxLat: 13.3, minLng: 77.3, maxLng: 77.9 } as const;

export function isInBengaluru(p: LatLng): boolean {
  return (
    p.lat >= BENGALURU_BBOX.minLat &&
    p.lat <= BENGALURU_BBOX.maxLat &&
    p.lng >= BENGALURU_BBOX.minLng &&
    p.lng <= BENGALURU_BBOX.maxLng
  );
}

const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}
