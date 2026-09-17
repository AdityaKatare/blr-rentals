import type {
  Furnishing,
  GeoAccuracy,
  LatLng,
  ListedBy,
  ListingStatus,
  MetroLine,
  MetroStationStatus,
  NormalizedListing,
  Parking,
  PropertyType,
  SourceSlug,
} from '@blr/core';

export interface LocalityMatch {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SearchHit {
  id: string;
  source: SourceSlug;
  sourceUrl: string;
  title: string;
  rent: number;
  deposit: number | null;
  maintenance: number | null;
  bedrooms: number;
  is1rk: boolean;
  bedroomsPlus: boolean;
  bathrooms: number | null;
  areaSqft: number | null;
  propertyType: PropertyType;
  furnishing: Furnishing;
  parking: Parking;
  listedBy: ListedBy;
  locality: string | null;
  societyName: string | null;
  geoAccuracy: GeoAccuracy;
  isVerified: boolean;
  amenities: string[];
  imageCount: number;
  images: string[];
  availableFrom: string | null;
  postedAt: string | null;
  updatedAt: string | null;
  distanceM: number | null;
  score: number | null;
  status: ListingStatus;
  rentDrop: RentDrop | null;
  propertyId: string | null;
  sources: SourceSlug[];
  otherListings: OtherListing[];
  nearestMetro: NearestMetro | null;
}

export interface NearestMetro {
  name: string;
  lines: MetroLine[];
  distanceM: number;
}

export interface MetroStation {
  id: number;
  slug: string;
  name: string;
  lines: MetroLine[];
  status: MetroStationStatus;
  lat: number;
  lng: number;
}

export interface RentDrop {
  from: number;
  at: string;
}

export interface OtherListing {
  id: string;
  source: SourceSlug;
  rent: number;
  sourceUrl: string;
  updatedAt: string | null;
}

export interface SearchResult {
  center: { lat: number; lng: number; locality: LocalityMatch | null };
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  hits: SearchHit[];
  rankedCandidates: number | null;
  tookMs: number;
}

export interface ResolvedSearchArea {
  id: number | null;
  slug: string;
  name: string;
  center: LatLng;
  radiusKm: number;
  sourceOverrides: Record<string, Record<string, unknown>>;
}

export interface DedupeSummary {
  examined: number;
  grouped: number;
  created: number;
  moved: number;
  unchanged: number;
  propertiesRemoved: number;
}

export interface UpsertSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  changes: number;
  touchedIds: string[];
}

export interface ListingStore {
  upsertMany(listings: NormalizedListing[]): Promise<UpsertSummary>;
}

export type RunStatus = 'ok' | 'partial' | 'failed';

export interface FinishedRun {
  status: RunStatus;
  pagesPlanned: readonly string[];
  pagesFetched: number;
  listingsSeen: number;
  listingsSkipped: number;
  emptySlices: readonly string[];
  parseFailures: number;
  httpErrors: number;
  errors: readonly string[];
  blocked: boolean;
  upsert?: Pick<UpsertSummary, 'inserted' | 'updated' | 'unchanged'>;
}

export interface RunRecorder {
  start(source: SourceSlug, searchAreaId: number | null): Promise<number>;
  finish(runId: number, run: FinishedRun): Promise<void>;
}

export type StaleSummary =
  | { skipped: false; markedStale: number; markedRemoved: number }
  | { skipped: true; reason: string };

export interface RecentRun {
  id: number;
  source: SourceSlug;
  area: string | null;
  status: RunStatus | 'running';
  startedAt: string;
  finishedAt: string | null;
  pagesFetched: number;
  listingsSeen: number;
  inserted: number;
  updated: number;
  parseFailures: number;
  httpErrors: number;
}

export interface SourceOverview {
  slug: SourceSlug;
  enabled: boolean;
  transport: 'http' | 'browser';
  crawlIntervalMin: number;
  activeListings: number;
}

export interface ListingCounts {
  activeListings: number;
  homes: number;
  groupedHomes: number;
  ungrouped: number;
}
