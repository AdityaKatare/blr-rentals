import { AREA_RADIUS_M, AREA_RENT_MAX, AREA_RENT_MIN, type SortOption } from '@blr/core';
import type { Sql } from '../client';
import { geographyPoint, type Fragment } from '../sql';
import type {
  AreaListings,
  AreaPlace,
  LocalityCoverage,
  LocalityMatch,
  NearestMetro,
  SearchHit,
  SocietyBedroomStat,
} from '../types';
import { enrichHits, hitColumns, NEAREST_METRO_MAX_M, toHit, type ListingRow } from './hits';
import { localityBySlug } from './localities';
import { cardCategories } from './proximity';
import { orderBy } from './search';
import { members, societySort, units, type SocietyOption } from './societies';

export const AREA_PAGE_SIZE = 25;
export const AREA_PLACES_LIMIT = 3;
export const AREA_SOCIETIES_LIMIT = 6;
export const AREA_NEIGHBOURS_LIMIT = 12;
export const AREA_SIZE_MIN_UNITS = 3;

const plausibleRent = (sql: Sql) => sql`l.rent BETWEEN ${AREA_RENT_MIN} AND ${AREA_RENT_MAX}`;

const nearestArea = (sql: Sql, point: Fragment) =>
  sql`(SELECT o.id FROM localities o ORDER BY o.centroid <-> ${point} LIMIT 1)`;

const inArea = (sql: Sql, id: number, centre: Fragment) => sql`
  l.status = 'active'
  AND l.location IS NOT NULL
  AND ST_DWithin(l.location, ${centre}, ${AREA_RADIUS_M})
  AND ${plausibleRent(sql)}
  AND ${nearestArea(sql, sql`l.location`)} = ${id}`;

export async function localityCoverage(sql: Sql): Promise<LocalityCoverage[]> {
  return sql<LocalityCoverage[]>`
    SELECT n.id, count(DISTINCT COALESCE(l.property_id, l.id))::int AS listings
    FROM listings l
    CROSS JOIN LATERAL (
      SELECT o.id, o.centroid
      FROM localities o
      ORDER BY o.centroid <-> l.location
      LIMIT 1
    ) n
    WHERE l.status = 'active'
      AND l.location IS NOT NULL
      AND ${plausibleRent(sql)}
      AND ST_DWithin(l.location, n.centroid, ${AREA_RADIUS_M})
    GROUP BY n.id`;
}

async function areaBedroomStats(sql: Sql, id: number, centre: Fragment): Promise<SocietyBedroomStat[]> {
  const rows = await sql<{ bedrooms: number; units: number; rentMin: number; rentMedian: number; rentMax: number }[]>`
    SELECT l.bedrooms, count(DISTINCT COALESCE(l.property_id, l.id))::int AS units,
           percentile_cont(0.1) WITHIN GROUP (ORDER BY l.rent) AS "rentMin",
           percentile_cont(0.5) WITHIN GROUP (ORDER BY l.rent) AS "rentMedian",
           percentile_cont(0.9) WITHIN GROUP (ORDER BY l.rent) AS "rentMax"
    FROM listings l
    WHERE ${inArea(sql, id, centre)}
    GROUP BY l.bedrooms
    HAVING count(DISTINCT COALESCE(l.property_id, l.id)) >= ${AREA_SIZE_MIN_UNITS}
    ORDER BY l.bedrooms`;
  return rows.map((r) => ({
    ...r,
    rentMin: Math.round(r.rentMin),
    rentMedian: Math.round(r.rentMedian),
    rentMax: Math.round(r.rentMax),
  }));
}

async function areaMetro(sql: Sql, centre: Fragment): Promise<NearestMetro[]> {
  const rows = await sql<(Omit<NearestMetro, 'distanceM'> & { distance_m: number })[]>`
    SELECT st.name, st.lines, ST_Distance(st.location, ${centre}) AS distance_m
    FROM metro_stations st
    WHERE st.status = 'open' AND ST_DWithin(st.location, ${centre}, ${NEAREST_METRO_MAX_M})
    ORDER BY st.location <-> ${centre}
    LIMIT ${AREA_PLACES_LIMIT}`;
  return rows.map(({ distance_m, ...rest }) => ({ ...rest, distanceM: Math.round(distance_m) }));
}

async function areaTechParks(sql: Sql, centre: Fragment): Promise<AreaPlace[]> {
  const rows = await sql<{ name: string; distance_m: number }[]>`
    SELECT name, min(ST_Distance(location, ${centre})) AS distance_m
    FROM pois
    WHERE category = 'tech_park' AND name IS NOT NULL AND ST_DWithin(location, ${centre}, ${AREA_RADIUS_M})
    GROUP BY name
    ORDER BY distance_m
    LIMIT ${AREA_PLACES_LIMIT}`;
  return rows.map((r) => ({ name: r.name, distanceM: Math.round(r.distance_m) }));
}

async function areaSocieties(sql: Sql, id: number, centre: Fragment): Promise<SocietyOption[]> {
  return sql<SocietyOption[]>`
    SELECT k.slug, k.name, ${units(sql)} AS units
    FROM ${members(sql)}
    WHERE ST_DWithin(k.centre, ${centre}, ${AREA_RADIUS_M})
      AND ${nearestArea(sql, sql`k.centre`)} = ${id}
    GROUP BY k.slug, k.name
    ORDER BY units DESC, name
    LIMIT ${AREA_SOCIETIES_LIMIT}`;
}

async function areaNeighbours(sql: Sql, id: number, centre: Fragment): Promise<LocalityMatch[]> {
  return sql<LocalityMatch[]>`
    SELECT id, slug, name, aliases, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng
    FROM localities
    WHERE id <> ${id}
    ORDER BY centroid <-> ${centre}
    LIMIT ${AREA_NEIGHBOURS_LIMIT}`;
}

export async function areaListings(
  sql: Sql,
  slug: string,
  options: { page?: number; pageSize?: number; sort?: SortOption } = {},
  now: Date = new Date(),
): Promise<AreaListings | null> {
  const started = performance.now();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? AREA_PAGE_SIZE;
  const sort = societySort(options.sort ?? 'rent_asc');

  const area = await localityBySlug(sql, slug);
  if (!area) return null;
  const centre = geographyPoint(sql, area.lat, area.lng);

  const [rows, byBedrooms, metro, techParks, societies, neighbours] = await Promise.all([
    sql<(ListingRow & { total: number })[]>`
      WITH matched AS (
        SELECT COALESCE(l.property_id, l.id) AS group_id, ${hitColumns(sql, centre)}
        FROM listings l
        JOIN sources s ON s.id = l.source_id
        WHERE ${inArea(sql, area.id, centre)}
      ),
      grouped AS (
        SELECT DISTINCT ON (group_id) *
        FROM matched
        ORDER BY group_id, rent ASC, updated_ts DESC, id
      )
      SELECT *, count(*) OVER ()::int AS total
      FROM grouped
      ORDER BY ${orderBy(sql, sort)}
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    areaBedroomStats(sql, area.id, centre),
    areaMetro(sql, centre),
    areaTechParks(sql, centre),
    areaSocieties(sql, area.id, centre),
    areaNeighbours(sql, area.id, centre),
  ]);

  const hits: SearchHit[] = rows.map((r) => toHit(r, null));
  await enrichHits(sql, hits, now, { nearby: cardCategories([]) });
  const total = rows[0]?.total ?? 0;

  return {
    area,
    byBedrooms,
    metro,
    techParks,
    societies,
    neighbours,
    hits,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    sort,
    tookMs: Math.round(performance.now() - started),
  };
}
