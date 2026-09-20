# blr-rentals

One search box over Bangalore rental listings from several portals. MVP sources are **NoBroker** and **MagicBricks**; Housing.com and 99acres exist as disabled adapter stubs.

**Status: working MVP.** NoBroker and MagicBricks are scraped, normalised, deduplicated across sources and searchable by radius, with a shortlist and a `/status` page. Results can be filtered by straight-line distance to an open Namma Metro station and every card shows its nearest station (`docs/metro-stations.md`). Search also filters on who the landlord will take and on the deposit in months, sorts by what it costs to move in (`docs/move-in-cost.md`), and every apartment has its own page listing all of its units (`docs/apartments.md`). Scheduling is not set up yet.

## Layout

```
apps/web        Next.js — search, apartments, shortlist, /status   (server components query Postgres directly)
apps/scraper    Node CLI — sources/, pipeline/, http/  (writes to Postgres)
packages/core   Zod contracts: NormalizedListing, SearchQuery, enums, normalizers, ranking, dedupe scoring
packages/db     SQL migrations, seeds, the postgres-js client and all search/dedupe queries
```

One monorepo, two runtime processes, one PostGIS database. Nothing is deployed; the
scraper is run by hand.

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

## Operating rules

- `robots.txt` is checked before every request; a disallowed URL is a bug.
- Honest User-Agent with a contact address. If a source blocks it, we stop — no spoofing, no proxies.
- ≤ 1 request every 2–3 s per host, one worker per source, abort on 403/406.
- Poster names, phone numbers and emails are stripped before storage. Only `listed_by` (owner/broker) is kept.
- Every result links out to the source. Images are hot-linked, never re-hosted.
- Personal-use tool.
