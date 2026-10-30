import { SOCIETY_NAME_MIN_LENGTH, type SortOption, type SourceSlug } from '@blr/core';
import type { Sql } from '../client';
import { inTransaction, utcIso, type Fragment } from '../sql';
import type { NearestMetro, SearchHit, SocietyBedroomStat, SocietyDetail, SocietyListings, SocietySummary } from '../types';
import { enrichHits, hitColumns, NEAREST_METRO_MAX_M, toHit, type ListingRow } from './hits';
import { orderBy } from './search';

export const SOCIETY_OPTIONS_LIMIT = 300;
export const SOCIETY_LIST_LIMIT = 60;
export const SOCIETY_PAGE_SIZE = 25;
export const SOCIETY_RADIUS_M = 1000;
export const SOCIETY_MIN_UNITS = 2;

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

const members = (sql: Sql) => sql`societies k
  JOIN listings l ON l.society_key = k.key AND l.status = 'active' AND ST_DWithin(l.location, k.centre, k.radius_m)
  JOIN sources s ON s.id = l.source_id`;

const units = (sql: Sql) => sql`count(DISTINCT COALESCE(l.property_id, l.id))::int`;

const summaryColumns = (sql: Sql) => sql`
  k.slug,
  k.name,
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
    SELECT k.slug, k.name, ${units(sql)} AS units
    FROM ${members(sql)}
    GROUP BY k.slug, k.name
    ORDER BY units DESC, name
    LIMIT ${limit}`;
}

export async function listSocieties(
  sql: Sql,
  options: { q?: string; limit?: number } = {},
): Promise<{ societies: SocietySummary[]; total: number }> {
  const limit = options.limit ?? SOCIETY_LIST_LIMIT;
  const q = options.q?.trim();
  const match: Fragment = q ? sql`WHERE k.name ILIKE ${`%${q}%`}` : sql``;
  const centre = sql`ST_Centroid(ranked.precise_locations)::geography`;

  const rows = await sql<(SocietySummary & MetroColumns & { total: number })[]>`
    WITH grouped AS (
      SELECT ${summaryColumns(sql)}
      FROM ${members(sql)}
      ${match}
      GROUP BY k.slug, k.name
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
      FROM ${members(sql)}
      WHERE k.slug = ${slug}
      GROUP BY k.slug, k.name
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
    FROM ${members(sql)}
    WHERE k.slug = ${slug}
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
      FROM ${members(sql)}
      WHERE k.slug = ${slug}
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

export interface StoredSocietyName {
  id: string;
  current: string | null;
  given: string | null;
}

export async function storedSocietyNames(sql: Sql, source: SourceSlug, rawField: string): Promise<StoredSocietyName[]> {
  return sql<StoredSocietyName[]>`
    SELECT l.id, l.society_name AS current, l.raw->>${rawField} AS given
    FROM listings l
    JOIN sources s ON s.id = l.source_id
    WHERE s.slug = ${source}`;
}

export async function renameSocieties(sql: Sql, renames: readonly { id: string; name: string | null }[]): Promise<number> {
  if (renames.length === 0) return 0;
  const result = await sql`
    UPDATE listings l
    SET society_name = r.name
    FROM jsonb_to_recordset(${JSON.stringify(renames)}::jsonb) AS r(id uuid, name text)
    WHERE l.id = r.id AND l.society_name IS DISTINCT FROM r.name`;
  return result.count;
}

export async function refreshSocieties(sql: Sql): Promise<number> {
  return inTransaction(sql, async (tx) => {
    await tx`DELETE FROM societies`;
    const inserted = await tx`
      WITH located AS (
        SELECT l.id, COALESCE(l.property_id, l.id) AS unit, l.society_key AS key, l.society_name AS name, l.location
        FROM listings l
        WHERE l.status = 'active'
          AND l.society_key IS NOT NULL
          AND l.location IS NOT NULL
          AND length(btrim(l.society_name)) >= ${SOCIETY_NAME_MIN_LENGTH}
          AND l.society_name ~* '[a-z].*[a-z]'
      ),
      density AS (
        SELECT a.id, a.key, a.location, count(DISTINCT b.unit) AS near
        FROM located a
        JOIN located b ON b.key = a.key AND ST_DWithin(a.location, b.location, ${SOCIETY_RADIUS_M})
        GROUP BY a.id, a.key, a.location
      ),
      centres AS (
        SELECT DISTINCT ON (key) key, location AS centre
        FROM density
        ORDER BY key, near DESC, id
      ),
      totals AS (
        SELECT key, count(DISTINCT unit) AS total FROM located GROUP BY key
      ),
      members AS (
        SELECT c.key, c.centre, l.unit, btrim(l.name) AS name
        FROM centres c
        JOIN located l ON l.key = c.key AND ST_DWithin(l.location, c.centre, ${SOCIETY_RADIUS_M})
      ),
      known AS (
        SELECT m.key, m.centre
        FROM members m
        JOIN totals t ON t.key = m.key
        GROUP BY m.key, m.centre, t.total
        HAVING count(DISTINCT m.unit) >= ${SOCIETY_MIN_UNITS} AND count(DISTINCT m.unit) * 2 >= t.total
      ),
      spellings AS (
        SELECT DISTINCT ON (key) key, name
        FROM members
        GROUP BY key, name
        ORDER BY key, count(*) DESC, (name <> upper(name) AND name <> lower(name)) DESC, name
      )
      INSERT INTO societies (slug, key, name, centre, radius_m)
      SELECT nullif(btrim(regexp_replace(lower(sp.name), '[^a-z0-9]+', '-', 'g'), '-'), ''), k.key, sp.name, k.centre, ${SOCIETY_RADIUS_M}
      FROM known k
      JOIN spellings sp ON sp.key = k.key
      ON CONFLICT (slug) DO NOTHING`;
    return inserted.count;
  });
}
