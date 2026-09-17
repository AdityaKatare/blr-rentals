import {
  DAY_MS,
  type Furnishing,
  type GeoAccuracy,
  type ListedBy,
  type ListingStatus,
  type Parking,
  type PropertyType,
  type SourceSlug,
} from '@blr/core';
import type { Sql } from '../client';
import { pgArray, utcIso, type Fragment } from '../sql';
import type { OtherListing, SearchHit } from '../types';

export const RENT_DROP_WINDOW_DAYS = 14;
export const CARD_IMAGE_LIMIT = 12;

export interface ListingRow {
  id: string;
  property_id: string | null;
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
  image_count: number;
  available_from: string | null;
  posted_at: string | null;
  updated_at: string | null;
  status: ListingStatus;
  distance_m: number | null;
}

const lastUpdatedAt = (sql: Sql) => sql`COALESCE(l.source_updated_at, l.posted_at, l.first_seen_at)`;

export function toHit(r: ListingRow, score: number | null): SearchHit {
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
    imageCount: r.image_count,
    images: [],
    availableFrom: r.available_from,
    postedAt: r.posted_at,
    updatedAt: r.updated_at,
    distanceM: r.distance_m === null ? null : Math.round(r.distance_m),
    score,
    status: r.status,
    rentDrop: null,
    propertyId: r.property_id,
    sources: [r.source],
    otherListings: [],
  };
}

export function hitColumns(sql: Sql, point: Fragment | null) {
  const updated = lastUpdatedAt(sql);
  return sql`
    l.id, l.property_id, s.slug AS source, l.source_url, l.title, l.rent, l.deposit, l.maintenance,
    l.bedrooms, l.is_1rk, l.bedrooms_plus, l.bathrooms, l.area_sqft,
    l.property_type, l.furnishing, l.parking, l.listed_by,
    l.locality, l.society_name, l.geo_accuracy, l.is_verified, l.amenities,
    jsonb_array_length(l.images) AS image_count,
    l.available_from::text AS available_from,
    ${utcIso(sql, sql`l.posted_at`)} AS posted_at,
    ${updated} AS updated_ts,
    ${utcIso(sql, updated)} AS updated_at,
    l.status,
    ${point ? sql`ST_Distance(l.location, ${point})` : sql`NULL::float8`} AS distance_m`;
}

export async function enrichHits(sql: Sql, hits: SearchHit[], now: Date): Promise<void> {
  if (!hits.length) return;
  const ids = pgArray(hits.map((h) => h.id));
  const since = new Date(now.getTime() - RENT_DROP_WINDOW_DAYS * DAY_MS).toISOString();
  const [images, drops] = await Promise.all([
    sql<{ id: string; urls: string[] }[]>`
      SELECT l.id, COALESCE(array_agg(img.value ->> 'url' ORDER BY img.ordinality)
                            FILTER (WHERE img.ordinality <= ${CARD_IMAGE_LIMIT}), '{}') AS urls
      FROM listings l
      LEFT JOIN LATERAL jsonb_array_elements(l.images) WITH ORDINALITY AS img(value, ordinality) ON true
      WHERE l.id = ANY (${ids}::uuid[])
      GROUP BY l.id`,
    sql<{ id: string; from: number; at: string }[]>`
      SELECT DISTINCT ON (c.listing_id) c.listing_id AS id, (c.old_value #>> '{}')::int AS "from",
             ${utcIso(sql, sql`c.observed_at`)} AS at
      FROM listing_changes c
      JOIN listings l ON l.id = c.listing_id
      WHERE c.listing_id = ANY (${ids}::uuid[])
        AND c.field = 'rent'
        AND c.observed_at >= ${since}::timestamptz
        AND jsonb_typeof(c.old_value) = 'number'
        AND (c.old_value #>> '{}')::int > l.rent
      ORDER BY c.listing_id, c.observed_at ASC`,
  ]);
  const imagesById = new Map(images.map((r) => [r.id, [...new Set(r.urls.filter(Boolean))]]));
  const dropsById = new Map(drops.map((r) => [r.id, { from: r.from, at: r.at }]));
  for (const hit of hits) {
    hit.images = imagesById.get(hit.id) ?? [];
    hit.rentDrop = dropsById.get(hit.id) ?? null;
  }
  await attachOtherListings(sql, hits);
}

async function attachOtherListings(sql: Sql, hits: SearchHit[]): Promise<void> {
  const grouped = hits.filter((h) => h.propertyId);
  if (!grouped.length) return;
  const rows = await sql<(OtherListing & { propertyId: string })[]>`
    SELECT l.property_id AS "propertyId", l.id, s.slug AS source, l.rent, l.source_url AS "sourceUrl",
           ${utcIso(sql, lastUpdatedAt(sql))} AS "updatedAt"
    FROM listings l
    JOIN sources s ON s.id = l.source_id
    WHERE l.status = 'active' AND l.property_id = ANY (${pgArray(grouped.map((h) => h.propertyId!))}::uuid[])
    ORDER BY l.rent, l.id`;
  for (const hit of grouped) {
    const members = rows.filter((r) => r.propertyId === hit.propertyId);
    hit.otherListings = members
      .filter((m) => m.id !== hit.id)
      .map(({ propertyId: _p, ...rest }) => rest);
    hit.sources = [...new Set([hit.source, ...members.map((m) => m.source)])];
  }
}
