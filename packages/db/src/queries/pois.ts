import type { Sql } from '../client';
import type { PoiRow } from '../pois/osm';
import { inTransaction, pgArray } from '../sql';

export const POI_INSERT_CHUNK = 1000;

export async function replacePois(sql: Sql, source: string, rows: readonly PoiRow[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.category] = (counts[r.category] ?? 0) + 1;
  const categories = Object.keys(counts);
  if (!categories.length) return counts;

  await inTransaction(sql, async (tx) => {
    await tx`DELETE FROM pois WHERE source = ${source} AND category = ANY (${pgArray(categories)}::text[])`;
    for (let i = 0; i < rows.length; i += POI_INSERT_CHUNK) {
      const chunk = rows.slice(i, i + POI_INSERT_CHUNK).map((r) => ({
        category: r.category,
        name: r.name,
        source_ref: r.sourceRef,
        geojson: JSON.stringify(r.geometry),
        tags: r.tags,
      }));
      await tx`
        INSERT INTO pois (category, name, location, source, source_ref, tags)
        SELECT r.category, r.name, ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(r.geojson), 4326))::geography,
               ${source}, r.source_ref, r.tags
        FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb)
          AS r(category text, name text, source_ref text, geojson text, tags jsonb)`;
    }
  });
  return counts;
}

export async function poiCounts(sql: Sql): Promise<{ category: string; source: string; count: number }[]> {
  return sql<{ category: string; source: string; count: number }[]>`
    SELECT category, source, count(*)::int AS count FROM pois GROUP BY 1, 2 ORDER BY 1, 2`;
}
