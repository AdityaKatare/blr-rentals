ALTER TABLE listings
  ADD COLUMN society_slug text GENERATED ALWAYS AS (
    nullif(btrim(regexp_replace(lower(btrim(society_name)), '[^a-z0-9]+', '-', 'g'), '-'), '')
  ) STORED;

CREATE INDEX listings_society_slug_idx ON listings (society_slug) WHERE society_slug IS NOT NULL;
