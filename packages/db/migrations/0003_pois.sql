CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE pois (
  id          bigserial PRIMARY KEY,
  category    text NOT NULL,
  name        text,
  location    geography(Geometry,4326) NOT NULL,
  source      text NOT NULL,
  source_ref  text NOT NULL,
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pois_source_ref_uq UNIQUE (source, source_ref, category)
);
CREATE INDEX pois_category_location_gix ON pois USING gist (category, location);

ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_reader') THEN
    EXECUTE 'GRANT SELECT ON pois TO web_reader';
    EXECUTE 'CREATE POLICY web_reader_select ON pois FOR SELECT TO web_reader USING (true)';
  END IF;
END $$;
