-- 0000_init: extensions, enums, core tables, indexes.
-- Mirrors packages/db/src/schema.ts. Applied by `pnpm db:migrate`.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE transport AS ENUM ('http', 'browser');
CREATE TYPE property_type AS ENUM ('apartment', 'independent_house', 'villa', 'builder_floor', 'penthouse', 'studio', 'pg', 'other');
CREATE TYPE furnishing AS ENUM ('unfurnished', 'semi', 'full', 'unknown');
CREATE TYPE parking AS ENUM ('none', 'bike', 'car', 'both', 'unknown');
CREATE TYPE tenant_preference AS ENUM ('family', 'bachelor', 'company', 'any', 'unknown');
CREATE TYPE listed_by AS ENUM ('owner', 'broker', 'builder', 'unknown');
CREATE TYPE geo_accuracy AS ENUM ('exact', 'approximate', 'locality_centroid', 'none');
CREATE TYPE listing_status AS ENUM ('active', 'stale', 'removed');
CREATE TYPE run_status AS ENUM ('running', 'ok', 'partial', 'failed');

CREATE TABLE sources (
  id                 smallserial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  base_url           text NOT NULL,
  enabled            boolean NOT NULL DEFAULT false,
  transport          transport NOT NULL DEFAULT 'http',
  crawl_interval_min integer NOT NULL DEFAULT 720,
  min_delay_ms       integer NOT NULL DEFAULT 2500,
  notes              text,
  robots_checked_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE localities (
  id                 serial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  aliases            text[] NOT NULL DEFAULT '{}'::text[],
  centroid           geography(Point,4326) NOT NULL,
  centroid_accuracy  geo_accuracy NOT NULL DEFAULT 'approximate',
  source_refs        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX localities_centroid_gix ON localities USING gist (centroid);
CREATE INDEX localities_name_trgm_idx ON localities USING gin (name gin_trgm_ops);

CREATE TABLE search_areas (
  id                 serial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  locality_id        integer REFERENCES localities(id),
  center             geography(Point,4326) NOT NULL,
  radius_km          real NOT NULL DEFAULT 3,
  enabled            boolean NOT NULL DEFAULT true,
  source_overrides   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_areas_center_gix ON search_areas USING gist (center);

CREATE TABLE properties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_listing_id  uuid,
  location              geography(Point,4326),
  bedrooms              smallint,
  area_sqft             integer,
  rent_min              integer,
  rent_max              integer,
  listing_count         integer NOT NULL DEFAULT 0,
  sources               text[] NOT NULL DEFAULT '{}'::text[],
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_location_gix ON properties USING gist (location);

CREATE TABLE listings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             smallint NOT NULL REFERENCES sources(id),
  source_listing_id     text NOT NULL,
  source_url            text NOT NULL,
  property_id           uuid REFERENCES properties(id) ON DELETE SET NULL,

  title                 text NOT NULL,
  description           text,
  property_type         property_type NOT NULL DEFAULT 'other',
  bedrooms              smallint NOT NULL,
  is_1rk                boolean NOT NULL DEFAULT false,
  bedrooms_plus         boolean NOT NULL DEFAULT false,
  bathrooms             smallint,
  balconies             smallint,

  rent                  integer NOT NULL CHECK (rent > 0),
  deposit               integer,
  maintenance           integer,
  maintenance_included  boolean,

  area_sqft             integer,
  carpet_area_sqft      integer,
  floor                 smallint,
  total_floors          smallint,

  furnishing            furnishing NOT NULL DEFAULT 'unknown',
  parking               parking NOT NULL DEFAULT 'unknown',
  tenant_preference     tenant_preference NOT NULL DEFAULT 'unknown',
  listed_by             listed_by NOT NULL DEFAULT 'unknown',

  locality              text,
  sub_locality          text,
  city                  text NOT NULL DEFAULT 'Bengaluru',
  pincode               text,
  society_name          text,

  location              geography(Point,4326),
  geo_accuracy          geo_accuracy NOT NULL DEFAULT 'none',

  amenities             text[] NOT NULL DEFAULT '{}'::text[],
  images                jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_verified           boolean NOT NULL DEFAULT false,
  is_sponsored          boolean NOT NULL DEFAULT false,

  available_from        date,
  posted_at             timestamptz,
  source_updated_at     timestamptz,

  raw                   jsonb,
  raw_hash              text NOT NULL,

  status                listing_status NOT NULL DEFAULT 'active',
  first_seen_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  removed_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listings_source_listing_uq UNIQUE (source_id, source_listing_id)
);
CREATE INDEX listings_location_gix ON listings USING gist (location);
CREATE INDEX listings_rent_idx ON listings (rent);
CREATE INDEX listings_bedrooms_idx ON listings (bedrooms);
CREATE INDEX listings_status_last_seen_idx ON listings (status, last_seen_at);
CREATE INDEX listings_amenities_gin ON listings USING gin (amenities);
CREATE INDEX listings_property_idx ON listings (property_id);
CREATE INDEX listings_society_trgm_idx ON listings USING gin (society_name gin_trgm_ops);

ALTER TABLE properties
  ADD CONSTRAINT properties_canonical_listing_fk
  FOREIGN KEY (canonical_listing_id) REFERENCES listings(id) ON DELETE SET NULL;

CREATE TABLE listing_changes (
  id          bigserial PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  field       text NOT NULL,
  old_value   jsonb,
  new_value   jsonb
);
CREATE INDEX listing_changes_listing_idx ON listing_changes (listing_id, observed_at);

CREATE TABLE scrape_runs (
  id              bigserial PRIMARY KEY,
  source_id       smallint NOT NULL REFERENCES sources(id),
  search_area_id  integer REFERENCES search_areas(id),
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  status          run_status NOT NULL DEFAULT 'running',
  pages_fetched   integer NOT NULL DEFAULT 0,
  listings_seen   integer NOT NULL DEFAULT 0,
  inserted        integer NOT NULL DEFAULT 0,
  updated         integer NOT NULL DEFAULT 0,
  unchanged       integer NOT NULL DEFAULT 0,
  parse_failures  integer NOT NULL DEFAULT 0,
  http_errors     integer NOT NULL DEFAULT 0,
  error_sample    jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text
);
CREATE INDEX scrape_runs_source_started_idx ON scrape_runs (source_id, started_at);
