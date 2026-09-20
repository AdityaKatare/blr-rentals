import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type DbHandle } from '../client';
import { loadEnv } from '../env';
import { loadSeedLocalities, loadSeedMetroStations, loadSeedSearchAreas, loadSeedSources } from '../seeds';
import { geographyPoint } from '../sql';

export async function seed(
  handle: DbHandle,
): Promise<{ sources: number; localities: number; searchAreas: number; metroStations: number }> {
  const { sql } = handle;
  const [sources, localities, areas, stations] = await Promise.all([
    loadSeedSources(),
    loadSeedLocalities(),
    loadSeedSearchAreas(),
    loadSeedMetroStations(),
  ]);

  for (const s of sources) {
    await sql`
      INSERT INTO sources (slug, name, base_url, enabled, transport, crawl_interval_min, min_delay_ms, notes)
      VALUES (${s.slug}, ${s.name}, ${s.baseUrl}, ${s.enabled}, ${s.transport}, ${s.crawlIntervalMin}, ${s.minDelayMs}, ${s.notes ?? null})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        base_url = EXCLUDED.base_url,
        transport = EXCLUDED.transport,
        crawl_interval_min = EXCLUDED.crawl_interval_min,
        min_delay_ms = EXCLUDED.min_delay_ms,
        notes = EXCLUDED.notes,
        updated_at = now()`;
  }

  for (const l of localities) {
    await sql`
      INSERT INTO localities (slug, name, aliases, centroid, centroid_accuracy)
      VALUES (${l.slug}, ${l.name}, ${l.aliases}, ${geographyPoint(sql, l.lat, l.lng)}, ${l.accuracy ?? 'approximate'})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        aliases = EXCLUDED.aliases,
        centroid = EXCLUDED.centroid,
        centroid_accuracy = EXCLUDED.centroid_accuracy,
        updated_at = now()`;
  }

  for (const a of areas) {
    const result = await sql`
      INSERT INTO search_areas (slug, name, locality_id, center, radius_km, enabled, source_overrides)
      SELECT ${a.slug}, ${a.name}, l.id, l.centroid, ${a.radiusKm}, ${a.enabled ?? true}, ${JSON.stringify(a.sourceOverrides ?? {})}::jsonb
      FROM localities l WHERE l.slug = ${a.locality}
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        locality_id = EXCLUDED.locality_id,
        center = EXCLUDED.center,
        radius_km = EXCLUDED.radius_km,
        source_overrides = EXCLUDED.source_overrides,
        updated_at = now()`;
    if (result.count === 0) throw new Error(`search area "${a.slug}" references unknown locality "${a.locality}"`);
  }

  for (const m of stations) {
    await sql`
      INSERT INTO metro_stations (slug, name, lines, status, location, opened_on, source_refs)
      VALUES (${m.slug}, ${m.name}, ${m.lines}, ${m.status}, ${geographyPoint(sql, m.lat, m.lng)},
              ${m.openedOn ?? null}, ${JSON.stringify(m.refs ?? {})}::jsonb)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        lines = EXCLUDED.lines,
        status = EXCLUDED.status,
        location = EXCLUDED.location,
        opened_on = EXCLUDED.opened_on,
        source_refs = EXCLUDED.source_refs,
        updated_at = now()`;
  }

  return { sources: sources.length, localities: localities.length, searchAreas: areas.length, metroStations: stations.length };
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  loadEnv();
  const handle = createDb(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL);
  seed(handle)
    .then((r) =>
      console.log(
        `seeded ${r.sources} sources, ${r.localities} localities, ${r.searchAreas} search areas, ${r.metroStations} metro stations`,
      ),
    )
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => handle.close());
}
