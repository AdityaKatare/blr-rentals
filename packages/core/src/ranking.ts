import type { ListedBy } from './enums';
import type { SearchQuery } from './search-query';

/**
 * Relevance ranking. MVP evaluates this in memory over the page of candidates
 * PostGIS returns (M4 mirrors the same formula in SQL). Phase 2 can replace
 * `rankListings` with a learned model behind the same signature.
 */
export interface RankingWeights {
  distance: number;
  freshness: number;
  priceFit: number;
  completeness: number;
  ownerBonus: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  distance: 0.35,
  freshness: 0.25,
  priceFit: 0.2,
  completeness: 0.15,
  ownerBonus: 0.05,
};

export interface RankableListing {
  id: string;
  distanceM: number | null;
  ageDays: number | null;
  rent: number;
  hasImages: boolean;
  hasArea: boolean;
  geoExact: boolean;
  listedBy: ListedBy;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreListing(
  item: RankableListing,
  query: SearchQuery,
  w: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): number {
  const radiusM = query.radiusKm * 1000;
  const distance = item.distanceM === null ? 0.5 : clamp01(1 - item.distanceM / radiusM);
  const freshness = item.ageDays === null ? 0.5 : clamp01(1 - item.ageDays / 30);
  const maxRent = query.rent.max;
  // Under budget is mildly better; at budget is neutral (0.5).
  const priceFit = maxRent ? 0.5 + 0.5 * clamp01(1 - item.rent / maxRent) : 0.5;
  const completeness = (Number(item.hasImages) + Number(item.hasArea) + Number(item.geoExact)) / 3;
  const owner = item.listedBy === 'owner' ? 1 : 0;
  return (
    w.distance * distance +
    w.freshness * freshness +
    w.priceFit * priceFit +
    w.completeness * completeness +
    w.ownerBonus * owner
  );
}

export function rankListings<T extends RankableListing>(
  items: readonly T[],
  query: SearchQuery,
  w: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): Array<T & { score: number }> {
  return items
    .map((item) => ({ ...item, score: scoreListing(item, query, w) }))
    .sort((a, b) => b.score - a.score);
}
