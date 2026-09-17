# ADR-004: Leaflet with OpenStreetMap raster tiles for the map view

**Status:** accepted (2026-09-18)

## Context
Search gained a map in two places: a picker that sets the search centre by tapping a point, and a small map of the current page's hits inside the chosen radius. Candidates were MapLibre GL with OpenFreeMap vector tiles and Leaflet with OSM raster tiles, with or without react-leaflet. Bengaluru is the only city; no clustering, routing or 3D is planned.

## Decision
- Leaflet 1.9 with the public OSM raster tile server (`apps/web/constants/map.ts` holds the tile URL and attribution). No react-leaflet: two small hooks/components (`hooks/use-leaflet-map.ts`, `components/map/*`) own the map instance directly.
- Leaflet ships ~42 KB gzipped against ~230 KB for MapLibre; raster tiles need no WebGL and render as plain `<img>` elements, which keeps the page fast on phones and simple to style with Tailwind.
- No API key or account. OSM's tile usage policy allows light personal use; if it becomes a concern, the provider is one constant away (e.g. a Maptiler or OpenFreeMap raster endpoint).
- The Leaflet chunk is loaded with `next/dynamic({ ssr: false })` from client wrappers, so the search page's first-load JS does not include it and server rendering never touches `window`.
- Markers are `L.divIcon`s styled with Tailwind classes; the default PNG marker is never referenced, avoiding the well-known bundler path bug.

## Consequences
- Maps show only the selected radius and the current page's pins (at most 25), never the whole city; the results map stays cheap regardless of the total.
- The search URL contract is unchanged: `locality=` or `lat=`/`lng=`, mutually exclusive. Picking a point blanks `locality`; typing a locality blanks the coordinates.
- Raster tiles are less crisp than vector tiles on high-DPI screens and cannot be restyled. Moving to MapLibre later means replacing the hook and the two map components, nothing in `packages/*`.
