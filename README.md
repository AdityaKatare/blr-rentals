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

One monorepo, two runtime processes, one PostGIS database. Nothing is deployed.

## Quick start

```bash
corepack enable                 # provides pnpm
pnpm install
cp .env.example .env            # edit SCRAPER_CONTACT / SCRAPER_USER_AGENT
pnpm db:up                      # PostGIS on localhost:5433 (Docker Desktop must be running)
pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm test
pnpm scraper scrape --source nobroker --area koramangala --dry-run   # prints URLs, no network
pnpm scraper status
pnpm dev                        # http://localhost:3000
```

## Operating rules

- `robots.txt` is checked before every request; a disallowed URL is a bug.
- Honest User-Agent with a contact address. If a source blocks it, we stop — no spoofing, no proxies.
- ≤ 1 request every 2–3 s per host, one worker per source, abort on 403/406.
- Poster names, phone numbers and emails are stripped before storage. Only `listed_by` (owner/broker) is kept.
- Every result links out to the source. Images are hot-linked, never re-hosted.
- Personal-use tool.
