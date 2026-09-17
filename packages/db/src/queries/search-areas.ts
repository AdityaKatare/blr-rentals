import type { Sql } from '../client';
import type { ResolvedSearchArea } from '../types';

interface SearchAreaRow {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  source_overrides: Record<string, Record<string, unknown>> | null;
}

export async function loadSearchArea(sql: Sql, slug: string): Promise<ResolvedSearchArea | null> {
  const [row] = await sql<SearchAreaRow[]>`
    SELECT id, slug, name,
           ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lng,
           radius_km, source_overrides
    FROM search_areas
    WHERE slug = ${slug} AND enabled`;
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    center: { lat: Number(row.lat), lng: Number(row.lng) },
    radiusKm: Number(row.radius_km),
    sourceOverrides: row.source_overrides ?? {},
  };
}
