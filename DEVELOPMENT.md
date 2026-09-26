# Developing blr-rentals

## Layout

```
apps/web        Next.js — search, apartments, shortlist, /status   (server components query Postgres directly)
apps/scraper    Node CLI — sources/, pipeline/, http/  (writes to Postgres)
apps/extension  Chrome extension — overlays /api/lookup data on NoBroker and MagicBricks pages
packages/core   Zod contracts: NormalizedListing, SearchQuery, enums, normalizers, ranking, dedupe scoring
packages/db     SQL migrations, seeds, the postgres-js client and all search/dedupe queries
```

One monorepo, two runtime processes, one PostGIS database. Sources are NoBroker and
MagicBricks; Housing.com and 99acres exist as disabled adapter stubs. The scraper is run by
hand; scheduling is not set up.

## Quick start

```bash
corepack enable                 # provides pnpm
pnpm install
cp .env.example .env            # set DATABASE_URL, SCRAPER_CONTACT, SCRAPER_USER_AGENT
pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm test
pnpm scraper scrape --source nobroker --area koramangala --dry-run   # prints URLs, no network
pnpm scraper status
pnpm dev                        # http://localhost:3000
```

`DATABASE_URL` can point at any PostGIS-capable Postgres. Two setups are supported:

- **Supabase** (no Docker needed). Enable the `postgis` and `pg_trgm` extensions in the
  dashboard, then use the transaction pooler URI (port 6543) as `DATABASE_URL` and the
  session pooler URI (port 5432) as `DATABASE_URL_DIRECT`. Migrations and seeds prefer
  `DATABASE_URL_DIRECT` when it is set; everything else uses the pooled connection.
- **Local Docker** (`pnpm db:up`, PostGIS on localhost:5433). Still the fastest path for
  integration tests, which want a throwaway database.

The integration tests in `packages/db` read `TEST_DATABASE_URL` and skip themselves when it
is unset. They never fall back to `DATABASE_URL`, so a normal `pnpm test` cannot write to
whatever the app is pointed at.

## Deploying the web app

Vercel, root directory `apps/web`, Node 22. `apps/web/vercel.json` pins functions to `bom1`
so they sit next to the Supabase project in `ap-south-1`.

The site should not connect as `postgres`. Run `packages/db/sql/web-reader.sql` once in the
Supabase SQL editor with a real password: it creates a `web_reader` role with `SELECT` on
`public` and a permissive read policy on each table, which matters because row-level
security is on and only `postgres` bypasses it. New tables in later migrations need the
same policy. Set Vercel's `DATABASE_URL` to the transaction-pooler URI with
`web_reader.<project-ref>` as the user; never give it `DATABASE_URL_DIRECT`.

The site answers `/robots.txt` with disallow-all and every page carries `noindex`.

### Analytics and monitoring

`components/layout/telemetry.tsx` mounts Vercel Web Analytics and Speed Insights once, from
the root layout. Both need their toggle on in the project dashboard, need no environment
variables, and send nothing from `next dev`. Query strings are removed before anything is
sent, because search URLs can hold the `lat`/`lng` of a point someone picked on the map.
Neither uses cookies or stores IPs, so there is no consent banner.

| Where in the Vercel project | What it shows |
| --- | --- |
| Analytics | Visitors, page views, top pages and routes, referrers, countries, devices, browsers, OS |
| Speed Insights | Real-user LCP, INP, CLS, FCP, TTFB and a score per route, for mobile and desktop |
| Observability | Function invocations, errors, 5xx rate and duration per route |
| Logs | Runtime logs, including `[db]` errors from `server/db.ts` |

The environment filter in Analytics and Speed Insights separates Production from Preview
traffic. Custom events (`track()`) need a Pro plan, so this Hobby project does not use them.

## Nearby places

The **Nearby** filter (`near=tech_park:5000&near=hospital:2000`, one per category, all must
hold) reads `listing_nearby`, which stores each listing's nearest place in every `pois`
category, so the filter is an index lookup rather than a spatial search. `metro` is the
exception and still asks `metro_stations` directly, because it is small and its open/upcoming
status can change. Distances are
straight-line `ST_DWithin` on geography, measured to the edge of polygons, so a 5 km tech park
filter means 5 km from the campus boundary. Listings placed only at a locality centroid count
only for distances of 3 km or more. The old `nearMetro=1000` links still work.

Categories live in `packages/core/src/proximity.ts` (with their radius presets) and their OSM
tag rules in `packages/db/src/pois/osm.ts`. The same rules write the Overpass query and
classify the export, so adding a category means one entry in each plus a label in
`apps/web/constants/labels.ts`. No migration is needed. City-specific tech park names, OSM ids to drop and
renames go in `packages/db/seeds/poi_overrides.json`.

Refresh (the scripts never touch the network; the data is OpenStreetMap, ODbL, so keep the
attribution):

```bash
pnpm --silent --filter @blr/db pois query 12.70,77.35,13.25,77.90 > pois.ql
curl -sS -A "blr-rentals/0.1 (+mailto:you@example.com)" --data-urlencode "data@pois.ql"   https://overpass-api.de/api/interpreter -o pois.json
pnpm --filter @blr/db pois ingest pois.json --dry-run   # counts, plus every tech park for review
pnpm --filter @blr/db pois ingest pois.json
pnpm --filter @blr/db pois counts
```

`ingest` replaces the `osm` rows of each category present in the export, in one transaction,
and leaves categories the export does not mention alone. It then recomputes `listing_nearby`
for those categories. The listing store recomputes it for every listing a scrape inserts or
changes, so it only needs a manual rebuild after editing `pois` by hand:

```bash
pnpm --filter @blr/db pois refresh
```

## Browser extension

`apps/extension` is a Manifest V3 extension with no framework: a content script that reads the
listing id out of the portal's URL, a background worker that calls `/api/lookup` on the live
site, and a card rendered in a Shadow DOM. It never scrapes the page and sends nothing but the
listing id.

```bash
pnpm --filter @blr/extension build        # writes apps/extension/dist
pnpm --filter @blr/extension watch        # rebuild on change
```

Load it in Chrome at `chrome://extensions` → *Developer mode* → *Load unpacked* →
`apps/extension/dist`. After a rebuild, click the reload icon on the extension card. Open any
NoBroker `/property/…/detail` or MagicBricks `/propertyDetails/…` page.

## Operating rules

- `robots.txt` is checked before every request; a disallowed URL is a bug.
- Honest User-Agent with a contact address. If a source blocks it, we stop — no spoofing, no proxies.
- ≤ 1 request every 2–3 s per host, one worker per source, abort on 403/406.
- Poster names, phone numbers and emails are stripped before storage. Only `listed_by` (owner/broker) is kept.
- Every result links out to the source. Images are hot-linked, never re-hosted.
- Personal-use tool.
