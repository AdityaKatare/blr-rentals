# blr-rentals

One search box over Bangalore rental listings from several portals. MVP sources are **NoBroker** and **MagicBricks**; Housing.com and 99acres exist as disabled adapter stubs.

**Status: scaffold.** The shape is here (schema, contracts, CLI, HTTP/robots plumbing, placeholder UI). No source is parsed yet.

## Layout

```
apps/web        Next.js — search UI, /api/search, /status   (this is the whole "backend")
apps/scraper    Node CLI — sources/, pipeline/, http/         (runs on a schedule, writes to Postgres)
packages/core   Zod contracts: NormalizedListing, SearchQuery, enums, normalizers, ranking, dedupe
packages/db     Drizzle schema, SQL migrations, seeds (sources, localities, search areas)
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
