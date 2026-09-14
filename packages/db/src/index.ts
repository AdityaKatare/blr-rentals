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
  findLocality,
  listLocalities,
  RELEVANCE_CANDIDATE_CAP,
  searchListings,
  type LocalityMatch,
  type OtherListing,
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
