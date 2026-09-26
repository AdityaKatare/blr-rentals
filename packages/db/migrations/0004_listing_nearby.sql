CREATE TABLE listing_nearby (
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  category     text NOT NULL,
  name         text,
  distance_m   real NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, category)
);
CREATE INDEX listing_nearby_category_distance_idx ON listing_nearby (category, distance_m) INCLUDE (listing_id);

ALTER TABLE listing_nearby ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_reader') THEN
    EXECUTE 'GRANT SELECT ON listing_nearby TO web_reader';
    EXECUTE 'CREATE POLICY web_reader_select ON listing_nearby FOR SELECT TO web_reader USING (true)';
  END IF;
END $$;
