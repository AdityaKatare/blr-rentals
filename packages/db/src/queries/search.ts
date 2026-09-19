import { DAY_MS, rankListings, type SearchQuery } from '@blr/core';
import type { Sql } from '../client';
import { geographyPoint, pgArray } from '../sql';
import type { LocalityMatch, SearchHit, SearchResult } from '../types';
import { enrichHits, hitColumns, plausibleDeposit, toHit, type ListingRow } from './hits';
import { localityById, nearestLocality } from './localities';

export const RELEVANCE_CANDIDATE_CAP = 1000;

export const DISTANCE_BAND_M = 500;
export const RENT_BAND = 2500;

export function orderBy(sql: Sql, sort: SearchQuery['sort']) {
  if (sort === 'rent_asc') return sql`rent ASC, distance_m ASC, id`;
  if (sort === 'rent_desc') return sql`rent DESC, distance_m ASC, id`;
  if (sort === 'movein_asc') return sql`move_in_cost ASC NULLS LAST, rent ASC, id`;
  if (sort === 'movein_desc') return sql`move_in_cost DESC NULLS LAST, rent DESC, id`;
  if (sort === 'newest') return sql`updated_ts DESC, id`;
  if (sort === 'near_cheap') return sql`floor(distance_m / ${DISTANCE_BAND_M}) ASC, rent ASC, id`;
  if (sort === 'cheap_near') return sql`floor(rent / ${RENT_BAND}) ASC, distance_m ASC, id`;
  if (sort === 'new_cheap') return sql`date_trunc('day', updated_ts) DESC, rent ASC, id`;
  return sql`distance_m ASC, id`;
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

  const point = geographyPoint(sql, lat, lng);
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
  if (query.tenantPreference) {
    conditions.push(sql`l.tenant_preference IN (${query.tenantPreference}::tenant_preference, 'any')`);
  }
  if (query.depositMaxMonths !== undefined) {
    conditions.push(sql`${plausibleDeposit(sql)} AND l.deposit <= l.rent * ${query.depositMaxMonths}`);
  }
  if (query.nearMetroM !== undefined) {
    conditions.push(sql`l.geo_accuracy IN ('exact', 'approximate')`);
    conditions.push(sql`EXISTS (
      SELECT 1 FROM metro_stations m
      WHERE m.status = 'open' AND ST_DWithin(m.location, l.location, ${query.nearMetroM}))`);
  }

  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);

  const order = orderBy(sql, query.sort);

  const relevance = query.sort === 'relevance';
  const limit = relevance ? RELEVANCE_CANDIDATE_CAP : query.pageSize;
  const offset = relevance ? 0 : (query.page - 1) * query.pageSize;

  const [rows, nearest] = await Promise.all([
    sql<(ListingRow & { total: number; distance_m: number })[]>`
      WITH matched AS (
        SELECT COALESCE(l.property_id, l.id) AS group_id, ${hitColumns(sql, point)}
        FROM listings l
        JOIN sources s ON s.id = l.source_id
        WHERE ${where}
      ),
      grouped AS (
        SELECT DISTINCT ON (group_id) *
        FROM matched
        ORDER BY group_id, rent ASC, updated_ts DESC, id
      )
      SELECT *, count(*) OVER ()::int AS total
      FROM grouped
      ORDER BY ${order}
      LIMIT ${limit} OFFSET ${offset}`,
    locality ? Promise.resolve(locality) : nearestLocality(sql, lat, lng),
  ]);

  const total = rows[0]?.total ?? 0;
  let hits: SearchHit[];
  if (relevance) {
    const ranked = rankListings(
      rows.map((r) => ({
        id: r.id,
        row: r,
        distanceM: r.distance_m,
        ageDays: r.updated_at ? (now.getTime() - Date.parse(r.updated_at)) / DAY_MS : null,
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
  await enrichHits(sql, hits, now);

  const rankedTotal = relevance ? Math.min(total, RELEVANCE_CANDIDATE_CAP) : total;
  return {
    center: { lat, lng, locality, nearest },
    total,
    page: query.page,
    pageSize: query.pageSize,
    pages: Math.max(1, Math.ceil(rankedTotal / query.pageSize)),
    hits,
    rankedCandidates: relevance ? rows.length : null,
    tookMs: Math.round(performance.now() - started),
  };
}
