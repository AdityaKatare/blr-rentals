import type { Sql } from '../client';
import type { MetroStation } from '../types';

export async function listMetroStations(sql: Sql): Promise<MetroStation[]> {
  return sql<MetroStation[]>`
    SELECT id, slug, name, lines, status,
           ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
    FROM metro_stations
    ORDER BY status, name`;
}
