# Namma Metro stations

`packages/db/seeds/metro_stations.json` holds every Namma Metro station with coordinates, the lines it serves and whether it is `open` or `upcoming` (under construction). It backs the **Near metro** search filter and the "N m to <station> metro" line on listing cards. Only `open` stations count for both; `upcoming` rows exist so the map can show them and so a status flip is a one-word edit.

Distances are straight-line (`ST_Distance` on geography), not walking distance, and cards say so in the tooltip. Listings whose location is only a locality centroid (`geo_accuracy = 'locality_centroid'`) never match the filter and never get a metro distance, because they would all appear to sit at one point.

## Source

OpenStreetMap, via the Overpass API. The seed is generated offline from a saved export so the repo scripts never touch the network.

Query (Bengaluru bounding box; open station nodes, under-construction station nodes, the subway route relations and their stop nodes, which carry line membership):

```
[out:json][timeout:180];
(
  node["railway"="station"]["station"="subway"](12.70,77.35,13.25,77.90);
  node["railway"="construction"]["station"="subway"](12.70,77.35,13.25,77.90);
  node["construction:railway"="station"](12.70,77.35,13.25,77.90);
)->.stations;
relation["route"="subway"]["network"="Namma Metro"](12.70,77.35,13.25,77.90)->.routes;
node(r.routes:"stop")->.stops;
.stations out body;
.routes out body;
.stops out body;
```

Run it with a descriptive User-Agent (Overpass returns 406 to anonymous clients):

```bash
curl -sS -A "blr-rentals/0.1 (+mailto:you@example.com)" \
  --data-urlencode "data@overpass-metro.ql" https://overpass-api.de/api/interpreter -o overpass-metro.json
```

## Refresh

```bash
pnpm --filter @blr/db build-metro-seed path/to/overpass-metro.json
git diff packages/db/seeds/metro_stations.json     # expect status flips and the odd new station
pnpm db:seed
```

The converter (`packages/db/src/scripts/build-metro-seed.ts`):

- `railway=station` → `open`; construction nodes → `upcoming`.
- Open stations get their lines from route relation stop nodes within 250 m or with the same normalised name; under-construction nodes carry the line in their `line` or `colour` tag.
- Strips `(u/c)` / `(Proposed)` suffixes, merges duplicate nodes of the same station and status (interchanges appear once with both lines), and fails loudly on any station that matches no line rather than seeding it silently.
- An upcoming row whose slug collides with an open station gets a `-upcoming` suffix (for example the Blue Line platforms at Central Silk Board).
- `openedOn` is filled only where OSM has an `opening_date` or `start_date`.

Seeding upserts on `slug` and never deletes, so a station that disappears from OSM has to be removed by hand, the same as localities.

Last generated: 2026-09-18 from OSM data timestamped 2026-09-17. Cross-checked against the Wikipedia list of Namma Metro stations: Purple 37, Green 31, Yellow 16 open (Majestic and Rashtreeya Vidyalaya Road are interchanges), Pink 18 and Blue 29 upcoming.
