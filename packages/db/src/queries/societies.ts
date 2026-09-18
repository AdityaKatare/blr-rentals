import { SOCIETY_NAME_MIN_LENGTH, type SortOption } from '@blr/core';
import type { Sql } from '../client';
import { utcIso, type Fragment } from '../sql';
import type { NearestMetro, SearchHit, SocietyBedroomStat, SocietyDetail, SocietyListings, SocietySummary } from '../types';
import { enrichHits, hitColumns, NEAREST_METRO_MAX_M, toHit, type ListingRow } from './hits';
import { orderBy } from './search';

export const SOCIETY_OPTIONS_LIMIT = 300;
export const SOCIETY_LIST_LIMIT = 60;
export const SOCIETY_PAGE_SIZE = 25;

export interface SocietyOption {
  slug: string;
  name: string;
  units: number;
}

interface MetroColumns {
  metro_name: string | null;
  metro_lines: NearestMetro['lines'] | null;
  metro_distance_m: number | null;
}

const named = (sql: Sql) => sql`l.status = 'active'
  AND l.society_slug IS NOT NULL
  AND length(btrim(l.society_name)) >= ${SOCIETY_NAME_MIN_LENGTH}`;

const units = (sql: Sql) => sql`count(DISTINCT COALESCE(l.property_id, l.id))::int`;

const summaryColumns = (sql: Sql) => sql`
  l.society_slug AS slug,
  mode() WITHIN GROUP (ORDER BY l.society_name) AS name,
  mode() WITHIN GROUP (ORDER BY l.locality) AS locality,
  ${units(sql)} AS units,
  min(l.rent)::int AS "rentMin",
  max(l.rent)::int AS "rentMax",
  array_agg(DISTINCT s.slug) AS sources,
  ST_Collect(l.location::geometry) FILTER (WHERE l.geo_accuracy IN ('exact', 'approximate')) AS precise_locations,
  ST_Collect(l.location::geometry) AS all_locations`;

const nearestStation = (sql: Sql, centre: Fragment) => sql`LEFT JOIN LATERAL (
    SELECT st.name AS metro_name, st.lines AS metro_lines, ST_Distance(st.location, ${centre}) AS metro_distance_m
    FROM metro_stations st
    WHERE st.status = 'open'
      AND ST_DWithin(st.location, ${centre}, ${NEAREST_METRO_MAX_M})
    ORDER BY st.location <-> ${centre}
    LIMIT 1
  ) m ON true`;

const toNearestMetro = (r: MetroColumns): NearestMetro | null =>
  r.metro_name === null || r.metro_lines === null || r.metro_distance_m === null
    ? null
    : { name: r.metro_name, lines: r.metro_lines, distanceM: Math.round(r.metro_distance_m) };

export async function societyOptions(sql: Sql, limit = SOCIETY_OPTIONS_LIMIT): Promise<SocietyOption[]> {
  return sql<SocietyOption[]>`
    SELECT l.society_slug AS slug,
           mode() WITHIN GROUP (ORDER BY l.society_name) AS name,
           ${units(sql)} AS units
    FROM listings l
    WHERE ${named(sql)}
    GROUP BY l.society_slug
    ORDER BY units DESC, name
    LIMIT ${limit}`;
}

export async function listSocieties(
  sql: Sql,
  options: { q?: string; limit?: number } = {},
): Promise<{ societies: SocietySummary[]; total: number }> {
  const limit = options.limit ?? SOCIETY_LIST_LIMIT;
  const q = options.q?.trim();
  const match: Fragment | null = q ? sql`AND l.society_name ILIKE ${`%${q}%`}` : null;
  const centre = sql`ST_Centroid(ranked.precise_locations)::geography`;

  const rows = await sql<(SocietySummary & MetroColumns & { total: number })[]>`
    WITH grouped AS (
      SELECT ${summaryColumns(sql)}
      FROM listings l
      JOIN sources s ON s.id = l.source_id
      WHERE ${named(sql)} ${match ?? sql``}
      GROUP BY l.society_slug
    ),
    ranked AS (
      SELECT *, count(*) OVER ()::int AS total
      FROM grouped
      ORDER BY units DESC, name
      LIMIT ${limit}
    )
    SELECT ranked.slug, ranked.name, ranked.locality, ranked.units, ranked."rentMin", ranked."rentMax",
           ranked.sources, ranked.total, m.metro_name, m.metro_lines, m.metro_distance_m
    FROM ranked
    ${nearestStation(sql, centre)}
    ORDER BY ranked.units DESC, ranked.name`;

  return {
    societies: rows.map(({ total: _t, metro_name: _n, metro_lines: _l, metro_distance_m: _d, ...rest }, i) => ({
      ...rest,
      nearestMetro: toNearestMetro(rows[i]!),
    })),
    total: rows[0]?.total ?? 0,
  };
}

export async function findSociety(sql: Sql, slug: string): Promise<SocietyDetail | null> {
  const centre = sql`ST_Centroid(grouped.precise_locations)::geography`;
  const [row] = await sql<
    (SocietySummary &
      MetroColumns & { localities: string[]; lat: number | null; lng: number | null; lastUpdatedAt: string | null })[]
  >`
    WITH grouped AS (
      SELECT ${summaryColumns(sql)},
             array_remove(array_agg(DISTINCT l.locality), NULL) AS localities,
             ${utcIso(sql, sql`max(COALESCE(l.source_updated_at, l.posted_at, l.first_seen_at))`)} AS "lastUpdatedAt"
      FROM listings l
      JOIN sources s ON s.id = l.source_id
      WHERE l.status = 'active' AND l.society_slug = ${slug}
      GROUP BY l.society_slug
    )
    SELECT grouped.slug, grouped.name, grouped.locality, grouped.units, grouped."rentMin", grouped."rentMax",
           grouped.sources, grouped.localities, grouped."lastUpdatedAt",
           ST_Y(ST_Centroid(COALESCE(grouped.precise_locations, grouped.all_locations))) AS lat,
           ST_X(ST_Centroid(COALESCE(grouped.precise_locations, grouped.all_locations))) AS lng,
           m.metro_name, m.metro_lines, m.metro_distance_m
    FROM grouped
    ${nearestStation(sql, centre)}`;
  if (!row) return null;
  const { lat, lng, metro_name: _n, metro_lines: _l, metro_distance_m: _d, ...rest } = row;
  return {
    ...rest,
    nearestMetro: toNearestMetro(row),
    center: lat === null || lng === null ? null : { lat, lng },
    byBedrooms: await bedroomStats(sql, slug),
  };
}

async function bedroomStats(sql: Sql, slug: string): Promise<SocietyBedroomStat[]> {
  const rows = await sql<{ bedrooms: number; units: number; rentMin: number; rentMedian: number; rentMax: number }[]>`
    SELECT l.bedrooms, ${units(sql)} AS units,
           min(l.rent)::int AS "rentMin",
           percentile_cont(0.5) WITHIN GROUP (ORDER BY l.rent) AS "rentMedian",
           max(l.rent)::int AS "rentMax"
    FROM listings l
    WHERE l.status = 'active' AND l.society_slug = ${slug}
    GROUP BY l.bedrooms
    ORDER BY l.bedrooms`;
  return rows.map((r) => ({ ...r, rentMedian: Math.round(r.rentMedian) }));
}

export const societySort = (sort: SortOption): SortOption =>
  sort === 'movein_asc' || sort === 'newest' ? sort : 'rent_asc';

export async function societyListings(
  sql: Sql,
  slug: string,
  options: { page?: number; pageSize?: number; sort?: SortOption } = {},
  now: Date = new Date(),
): Promise<SocietyListings | null> {
  const started = performance.now();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? SOCIETY_PAGE_SIZE;
  const sort = societySort(options.sort ?? 'rent_asc');

  const society = await findSociety(sql, slug);
  if (!society) return null;

  const rows = await sql<(ListingRow & { total: number })[]>`
    WITH matched AS (
      SELECT COALESCE(l.property_id, l.id) AS group_id, ${hitColumns(sql, null)}
      FROM listings l
      JOIN sources s ON s.id = l.source_id
      WHERE l.status = 'active' AND l.society_slug = ${slug}
    ),
    grouped AS (
      SELECT DISTINCT ON (group_id) *
      FROM matched
      ORDER BY group_id, rent ASC, updated_ts DESC, id
    )
    SELECT *, count(*) OVER ()::int AS total
    FROM grouped
    ORDER BY ${orderBy(sql, sort)}
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  const total = rows[0]?.total ?? 0;
  const hits: SearchHit[] = rows.map((r) => toHit(r, null));
  await enrichHits(sql, hits, now);

  return {
    society,
    hits,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    sort,
    tookMs: Math.round(performance.now() - started),
  };
}
