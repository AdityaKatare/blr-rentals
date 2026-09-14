export interface DedupeFeatures {
  distanceM: number | null;
  rentRatio: number;
  areaRatio: number | null;
  societySimilarity: number | null;
  floorMatch: boolean | null;
  totalFloorsMatch: boolean | null;
  bathroomsMatch: boolean | null;
  furnishingMatch: boolean;
  depositRatio: number | null;
}

export interface DedupeWeights {
  distance: number;
  rent: number;
  area: number;
  society: number;
  floor: number;
  totalFloors: number;
  bathrooms: number;
  furnishing: number;
  deposit: number;
}

export const DEFAULT_DEDUPE_WEIGHTS: DedupeWeights = {
  distance: 0.25,
  rent: 0.15,
  area: 0.15,
  society: 0.2,
  floor: 0.08,
  totalFloors: 0.05,
  bathrooms: 0.04,
  furnishing: 0.04,
  deposit: 0.04,
};

export const DEDUPE_THRESHOLD = 0.75;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreCandidate(f: DedupeFeatures, w: DedupeWeights = DEFAULT_DEDUPE_WEIGHTS): number {
  const bool = (b: boolean | null) => (b === null ? 0.5 : b ? 1 : 0);
  const parts: Array<[number, number]> = [
    [w.distance, f.distanceM === null ? 0.5 : clamp01(1 - f.distanceM / 250)],
    [w.rent, clamp01((f.rentRatio - 0.9) / 0.1)],
    [w.area, f.areaRatio === null ? 0.5 : clamp01((f.areaRatio - 0.85) / 0.15)],
    [w.society, f.societySimilarity === null ? 0.5 : clamp01(f.societySimilarity)],
    [w.floor, bool(f.floorMatch)],
    [w.totalFloors, bool(f.totalFloorsMatch)],
    [w.bathrooms, bool(f.bathroomsMatch)],
    [w.furnishing, f.furnishingMatch ? 1 : 0],
    [w.deposit, f.depositRatio === null ? 0.5 : clamp01((f.depositRatio - 0.8) / 0.2)],
  ];
  const total = parts.reduce((s, [wt]) => s + wt, 0);
  const score = parts.reduce((s, [wt, v]) => s + wt * v, 0) / total;
  return f.floorMatch === false ? score * FLOOR_MISMATCH_FACTOR : score;
}

export const FLOOR_MISMATCH_FACTOR = 0.5;
