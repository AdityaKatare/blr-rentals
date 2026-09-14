import {
  rankListings,
  type Furnishing,
  type GeoAccuracy,
  type ListedBy,
  type Parking,
  type PropertyType,
  type SearchQuery,
  type SourceSlug,
} from '@blr/core';
import type { DbHandle } from './client';

type Sql = DbHandle['sql'];

export const RELEVANCE_CANDIDATE_CAP = 1000;

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
  imageUrl: string | null;
  imageCount: number;
  availableFrom: string | null;
  postedAt: string | null;
  updatedAt: string | null;
  distanceM: number;
  score: number | null;
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

interface Row {
  id: string;
  source: SourceSlug;
  source_url: string;
  title: string;
  rent: number;
  deposit: number | null;
  maintenance: number | null;
  bedrooms: number;
  is_1rk: boolean;
  bedrooms_plus: boolean;
  bathrooms: number | null;
  area_sqft: number | null;
  property_type: PropertyType;
  furnishing: Furnishing;
  parking: Parking;
  listed_by: ListedBy;
  locality: string | null;
  society_name: string | null;
  geo_accuracy: GeoAccuracy;
  is_verified: boolean;
  amenities: string[];
  image_url: string | null;
  image_count: number;
  available_from: string | null;
  posted_at: string | null;
  updated_at: string | null;
  distance_m: number;
  total: number;
}

const pgArray = (values: readonly (string | number)[]): string => `{${values.join(',')}}`;

export async function listLocalities(sql: Sql): Promise<LocalityMatch[]> {
  return sql<LocalityMatch[]>`
    SELECT id, slug, name, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng
    FROM localities ORDER BY name`;
}

export async function findLocality(sql: Sql, text: string): Promise<LocalityMatch | null> {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  const [row] = await sql<LocalityMatch[]>`
    SELECT id, slug, name, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng
    FROM localities
    WHERE lower(name) = ${q} OR slug = ${q} OR ${q} = ANY (SELECT lower(a) FROM unnest(aliases) a)
       OR similarity(name, ${q}) > 0.3
    ORDER BY (lower(name) = ${q} OR slug = ${q}) DESC,
             (${q} = ANY (SELECT lower(a) FROM unnest(aliases) a)) DESC,
             similarity(name, ${q}) DESC
    LIMIT 1`;
  return row ?? null;
}

async function localityById(sql: Sql, id: number): Promise<LocalityMatch | null> {
  const [row] = await sql<LocalityMatch[]>`
    SELECT id, slug, name, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng
    FROM localities WHERE id = ${id}`;
  return row ?? null;
}

function toHit(r: Row, score: number | null): SearchHit {
  return {
    id: r.id,
    source: r.source,
    sourceUrl: r.source_url,
    title: r.title,
    rent: r.rent,
    deposit: r.deposit,
    maintenance: r.maintenance,
    bedrooms: r.bedrooms,
    is1rk: r.is_1rk,
    bedroomsPlus: r.bedrooms_plus,
    bathrooms: r.bathrooms,
    areaSqft: r.area_sqft,
    propertyType: r.property_type,
    furnishing: r.furnishing,
    parking: r.parking,
    listedBy: r.listed_by,
    locality: r.locality,
    societyName: r.society_name,
    geoAccuracy: r.geo_accuracy,
    isVerified: r.is_verified,
    amenities: r.amenities,
    imageUrl: r.image_url,
    imageCount: r.image_count,
    availableFrom: r.available_from,
    postedAt: r.posted_at,
    updatedAt: r.updated_at,
    distanceM: Math.round(r.distance_m),
    score,
  };
}

export async function searchListings(sql: Sql, query: SearchQuery, now: Date = new Date()): Promise<SearchResult> {
  const started = performance.now();

  let locality: LocalityMatch | null = null;
  let lat: number;
  let lng: number;
  if ('localityId' in query.center) {
    locality = await localityById(sql, query.center.localityId);
    if (!locality) throw new Error(`unknown locality id ${query.center.localityId}`);
    lat = locality.lat;
    lng = locality.lng;
  } else {
    lat = query.center.lat;
    lng = query.center.lng;
  }

  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const conditions = [
    sql`l.status = 'active'`,
    sql`l.location IS NOT NULL`,
    sql`ST_DWithin(l.location, ${point}, ${query.radiusKm * 1000})`,
  ];
  if (query.rent.min !== undefined) conditions.push(sql`l.rent >= ${query.rent.min}`);
  if (query.rent.max !== undefined) conditions.push(sql`l.rent <= ${query.rent.max}`);
  if (query.bedrooms.length) conditions.push(sql`l.bedrooms = ANY (${pgArray(query.bedrooms)}::smallint[])`);
  if (query.propertyTypes?.length) {
    conditions.push(sql`l.property_type = ANY (${pgArray(query.propertyTypes)}::property_type[])`);
  }
  if (query.furnishing?.length) conditions.push(sql`l.furnishing = ANY (${pgArray(query.furnishing)}::furnishing[])`);
  if (query.amenitiesAll?.length) conditions.push(sql`l.amenities @> ${pgArray(query.amenitiesAll)}::text[]`);
  if (query.parking === 'required') conditions.push(sql`l.parking IN ('bike', 'car', 'both')`);
  if (query.listedBy === 'owner') conditions.push(sql`l.listed_by = 'owner'`);
  if (query.availableBy) {
    conditions.push(sql`(l.available_from IS NULL OR l.available_from <= ${query.availableBy}::date)`);
  }
  if (query.sources?.length) conditions.push(sql`s.slug = ANY (${pgArray(query.sources)}::text[])`);

  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);
  const updated = sql`COALESCE(l.source_updated_at, l.posted_at, l.first_seen_at)`;

  const order =
    query.sort === 'rent_asc'
      ? sql`l.rent ASC, distance_m ASC, l.id`
      : query.sort === 'newest'
        ? sql`${updated} DESC, l.id`
        : sql`distance_m ASC, l.id`;

  const relevance = query.sort === 'relevance';
  const limit = relevance ? RELEVANCE_CANDIDATE_CAP : query.pageSize;
  const offset = relevance ? 0 : (query.page - 1) * query.pageSize;

  const rows = await sql<Row[]>`
    SELECT l.id, s.slug AS source, l.source_url, l.title, l.rent, l.deposit, l.maintenance,
           l.bedrooms, l.is_1rk, l.bedrooms_plus, l.bathrooms, l.area_sqft,
           l.property_type, l.furnishing, l.parking, l.listed_by,
           l.locality, l.society_name, l.geo_accuracy, l.is_verified, l.amenities,
           l.images -> 0 ->> 'url' AS image_url, jsonb_array_length(l.images) AS image_count,
           l.available_from::text AS available_from,
           to_char(l.posted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS posted_at,
           to_char(${updated} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
           ST_Distance(l.location, ${point}) AS distance_m,
           count(*) OVER ()::int AS total
    FROM listings l
    JOIN sources s ON s.id = l.source_id
    WHERE ${where}
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset}`;

  const total = rows[0]?.total ?? 0;
  let hits: SearchHit[];
  if (relevance) {
    const ranked = rankListings(
      rows.map((r) => ({
        id: r.id,
        row: r,
        distanceM: r.distance_m,
        ageDays: r.updated_at ? (now.getTime() - Date.parse(r.updated_at)) / 86_400_000 : null,
        rent: r.rent,
        hasImages: r.image_count > 0,
        hasArea: r.area_sqft !== null,
        geoExact: r.geo_accuracy === 'exact',
        listedBy: r.listed_by,
      })),
      query,
    );
    const start = (query.page - 1) * query.pageSize;
    hits = ranked.slice(start, start + query.pageSize).map((x) => toHit(x.row, Number(x.score.toFixed(4))));
  } else {
    hits = rows.map((r) => toHit(r, null));
  }

  const rankedTotal = relevance ? Math.min(total, RELEVANCE_CANDIDATE_CAP) : total;
  return {
    center: { lat, lng, locality },
    total,
    page: query.page,
    pageSize: query.pageSize,
    pages: Math.max(1, Math.ceil(rankedTotal / query.pageSize)),
    hits,
    rankedCandidates: relevance ? rows.length : null,
    tookMs: Math.round(performance.now() - started),
  };
}
