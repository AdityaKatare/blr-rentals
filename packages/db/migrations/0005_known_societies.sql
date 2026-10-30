ALTER TABLE listings
  ADD COLUMN society_key text GENERATED ALWAYS AS (
    nullif(regexp_replace(lower(society_name), '[^a-z0-9]+', '', 'g'), '')
  ) STORED;

CREATE INDEX listings_society_key_idx ON listings (society_key) WHERE society_key IS NOT NULL;

CREATE TABLE societies (
  slug          text PRIMARY KEY,
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  centre        geography(Point, 4326) NOT NULL,
  radius_m      real NOT NULL,
  refreshed_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_reader') THEN
    EXECUTE 'GRANT SELECT ON societies TO web_reader';
    EXECUTE 'CREATE POLICY web_reader_select ON societies FOR SELECT TO web_reader USING (true)';
  END IF;
END $$;
