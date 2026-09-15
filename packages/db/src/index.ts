export * from './schema';
export { createDb, type Db, type DbHandle } from './client';
export { parseEwkbPoint, toEwkbHex } from './ewkb';
export { loadEnv } from './env';
export {
  loadSeedLocalities,
  loadSeedSearchAreas,
  loadSeedSources,
  resolveSeedArea,
  type ResolvedSearchArea,
  type SeedLocality,
  type SeedSearchArea,
  type SeedSource,
} from './seeds';
export {
  CARD_IMAGE_LIMIT,
  findLocality,
  listingsByIds,
  listLocalities,
  RELEVANCE_CANDIDATE_CAP,
  RENT_DROP_WINDOW_DAYS,
  searchListings,
  type LocalityMatch,
  type OtherListing,
  type RentDrop,
  type SearchHit,
  type SearchResult,
} from './search';
export {
  DEDUPE_AREA_TOLERANCE,
  DEDUPE_RADIUS_M,
  DEDUPE_RENT_TOLERANCE,
  DEDUPE_SOCIETY_SIMILARITY,
  dedupeListings,
  refreshProperty,
  type DedupeOptions,
  type DedupeSummary,
} from './dedupe';
