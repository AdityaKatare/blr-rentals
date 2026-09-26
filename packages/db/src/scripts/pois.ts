import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../client';
import { loadEnv } from '../env';
import { buildPoiRows, includedRefs, osmRules, overpassQuery, type OsmElement, type PoiOverrides } from '../pois/osm';
import { poiCounts, replacePois } from '../queries/pois';

/**
 * Nearby-places data (DEVELOPMENT.md, "Nearby places"). Never touches the network: `query` prints Overpass QL to run by hand,
 * `ingest` loads the saved export.
 *
 *   pnpm --filter @blr/db pois query <south,west,north,east>
 *   pnpm --filter @blr/db pois ingest <overpass.json> [--dry-run]
 *   pnpm --filter @blr/db pois counts
 */

const OVERRIDES_PATH = fileURLToPath(new URL('../../seeds/poi_overrides.json', import.meta.url));

const loadOverrides = async (): Promise<PoiOverrides> => JSON.parse(await readFile(OVERRIDES_PATH, 'utf8')) as PoiOverrides;

function parseBbox(arg: string | undefined): [number, number, number, number] {
  const parts = (arg ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) throw new Error('bbox must be south,west,north,east');
  return parts as [number, number, number, number];
}

async function main(argv: string[]): Promise<void> {
  const [command, arg] = argv;
  if (command === 'query') {
    const overrides = await loadOverrides();
    process.stdout.write(overpassQuery(osmRules(overrides), parseBbox(arg), includedRefs(overrides)));
    return;
  }
  if (command === 'ingest') {
    if (!arg) throw new Error('usage: pois ingest <overpass.json> [--dry-run]');
    const { elements } = JSON.parse(await readFile(arg, 'utf8')) as { elements: OsmElement[] };
    const rows = buildPoiRows(elements, await loadOverrides());
    if (argv.includes('--dry-run')) {
      const counts: Record<string, number> = {};
      for (const r of rows) counts[r.category] = (counts[r.category] ?? 0) + 1;
      console.table(counts);
      for (const r of rows.filter((x) => x.category === 'tech_park')) console.log(`tech_park  ${r.sourceRef}  ${r.name}`);
      return;
    }
    loadEnv();
    const handle = createDb(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL, { max: 1, max_pipeline: 0 });
    try {
      console.table(await replacePois(handle.sql, 'osm', rows));
    } finally {
      await handle.close();
    }
    return;
  }
  if (command === 'counts') {
    loadEnv();
    const handle = createDb(process.env.DATABASE_URL, { max: 1, max_pipeline: 0 });
    try {
      console.table(await poiCounts(handle.sql));
    } finally {
      await handle.close();
    }
    return;
  }
  throw new Error('usage: pois query <bbox> | pois ingest <overpass.json> [--dry-run] | pois counts');
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2)).catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
