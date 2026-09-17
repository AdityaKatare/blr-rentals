CREATE TABLE metro_stations (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  lines       text[] NOT NULL CHECK (cardinality(lines) >= 1),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upcoming')),
  location    geography(Point,4326) NOT NULL,
  opened_on   date,
  source_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX metro_stations_location_gix ON metro_stations USING gist (location);
