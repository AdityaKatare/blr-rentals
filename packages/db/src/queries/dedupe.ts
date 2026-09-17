import { DEDUPE_THRESHOLD, DEFAULT_DEDUPE_WEIGHTS, scoreCandidate, type DedupeWeights } from '@blr/core';
import type { Sql } from '../client';
import { inTransaction } from '../sql';
import type { DedupeSummary } from '../types';

export interface DedupeOptions {
  listingIds?: readonly string[];
  threshold?: number;
  weights?: DedupeWeights;
}


interface TargetRow {
  id: string;
  property_id: string | null;
}

interface CandidateRow {
  id: string;
  property_id: string | null;
  distance_m: number | null;
  rent_ratio: number;
  area_ratio: number | null;
  society_similarity: number | null;
  floor_match: boolean | null;
  total_floors_match: boolean | null;
  bathrooms_match: boolean | null;
  furnishing_match: boolean;
  deposit_ratio: number | null;
}

export const DEDUPE_RADIUS_M = 250;
export const DEDUPE_RENT_TOLERANCE = 0.07;
export const DEDUPE_AREA_TOLERANCE = 0.12;
export const DEDUPE_SOCIETY_SIMILARITY = 0.6;

async function candidatesFor(tx: Sql, id: string): Promise<CandidateRow[]> {
  return tx<CandidateRow[]>`
    SELECT c.id, c.property_id,
      CASE WHEN t.location IS NULL OR c.location IS NULL OR t.geo_accuracy IN ('locality_centroid', 'none')
                OR c.geo_accuracy IN ('locality_centroid', 'none')
           THEN NULL ELSE ST_Distance(t.location, c.location) END AS distance_m,
      LEAST(t.rent, c.rent)::float8 / GREATEST(t.rent, c.rent) AS rent_ratio,
      CASE WHEN t.area_sqft IS NULL OR c.area_sqft IS NULL THEN NULL
           ELSE LEAST(t.area_sqft, c.area_sqft)::float8 / GREATEST(t.area_sqft, c.area_sqft) END AS area_ratio,
      CASE WHEN t.society_name IS NULL OR c.society_name IS NULL THEN NULL
           ELSE similarity(lower(t.society_name), lower(c.society_name)) END AS society_similarity,
      CASE WHEN t.floor IS NULL OR c.floor IS NULL THEN NULL ELSE t.floor = c.floor END AS floor_match,
      CASE WHEN t.total_floors IS NULL OR c.total_floors IS NULL THEN NULL ELSE t.total_floors = c.total_floors END AS total_floors_match,
      CASE WHEN t.bathrooms IS NULL OR c.bathrooms IS NULL THEN NULL ELSE t.bathrooms = c.bathrooms END AS bathrooms_match,
      (t.furnishing = c.furnishing AND t.furnishing <> 'unknown') AS furnishing_match,
      CASE WHEN t.deposit IS NULL OR c.deposit IS NULL OR GREATEST(t.deposit, c.deposit) = 0 THEN NULL
           ELSE LEAST(t.deposit, c.deposit)::float8 / GREATEST(t.deposit, c.deposit) END AS deposit_ratio
    FROM listings t
    JOIN listings c ON c.id <> t.id
    WHERE t.id = ${id}
      AND c.status = 'active'
      AND c.bedrooms = t.bedrooms
      AND c.is_1rk = t.is_1rk
      AND abs(c.rent - t.rent) <= ${DEDUPE_RENT_TOLERANCE}::float8 * GREATEST(c.rent, t.rent)
      AND (t.area_sqft IS NULL OR c.area_sqft IS NULL
           OR abs(c.area_sqft - t.area_sqft) <= ${DEDUPE_AREA_TOLERANCE}::float8 * GREATEST(c.area_sqft, t.area_sqft))
      AND ((t.geo_accuracy IN ('exact', 'approximate') AND c.geo_accuracy IN ('exact', 'approximate')
            AND ST_DWithin(c.location, t.location, ${DEDUPE_RADIUS_M}::float8))
           OR (t.society_name IS NOT NULL AND c.society_name IS NOT NULL
               AND similarity(lower(t.society_name), lower(c.society_name)) > ${DEDUPE_SOCIETY_SIMILARITY}::float8))`;
}

async function createProperty(tx: Sql): Promise<string> {
  const [row] = await tx<{ id: string }[]>`INSERT INTO properties DEFAULT VALUES RETURNING id`;
  return row!.id;
}

export async function refreshProperty(tx: Sql, propertyId: string): Promise<'updated' | 'removed'> {
  const removed = await tx`
    DELETE FROM properties p
    WHERE p.id = ${propertyId} AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.property_id = p.id)
    RETURNING p.id`;
  if (removed.length) return 'removed';

  await tx`
    WITH members AS (
      SELECT l.*, s.slug FROM listings l JOIN sources s ON s.id = l.source_id WHERE l.property_id = ${propertyId}
    ),
    canonical AS (
      SELECT id, location, bedrooms, area_sqft FROM members
      ORDER BY (status = 'active') DESC, jsonb_array_length(images) DESC, (area_sqft IS NOT NULL) DESC,
               COALESCE(source_updated_at, first_seen_at) DESC, id
      LIMIT 1
    )
    UPDATE properties p SET
      canonical_listing_id = canonical.id,
      location = canonical.location,
      bedrooms = canonical.bedrooms,
      area_sqft = canonical.area_sqft,
      rent_min = (SELECT min(rent) FROM members WHERE status = 'active'),
      rent_max = (SELECT max(rent) FROM members WHERE status = 'active'),
      listing_count = (SELECT count(*) FROM members WHERE status = 'active'),
      sources = COALESCE((SELECT array_agg(DISTINCT slug ORDER BY slug) FROM members WHERE status = 'active'), '{}'::text[]),
      updated_at = now()
    FROM canonical
    WHERE p.id = ${propertyId}`;
  return 'updated';
}

export async function dedupeListings(sql: Sql, opts: DedupeOptions = {}): Promise<DedupeSummary> {
  const threshold = opts.threshold ?? DEDUPE_THRESHOLD;
  const weights = opts.weights ?? DEFAULT_DEDUPE_WEIGHTS;
  const summary: DedupeSummary = { examined: 0, grouped: 0, created: 0, moved: 0, unchanged: 0, propertiesRemoved: 0 };

  const ids =
    opts.listingIds ??
    (await sql<{ id: string }[]>`SELECT id FROM listings WHERE status = 'active' ORDER BY first_seen_at, id`).map((r) => r.id);

  for (const id of ids) {
    await inTransaction(sql, async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('blr-rentals:dedupe'))`;
      const [target] = await tx<TargetRow[]>`
        SELECT id, property_id FROM listings WHERE id = ${id} AND status = 'active' FOR UPDATE`;
      if (!target) return;
      summary.examined += 1;

      const matches = (await candidatesFor(tx, id))
        .map((c) => ({
          ...c,
          score: scoreCandidate(
            {
              distanceM: c.distance_m,
              rentRatio: c.rent_ratio,
              areaRatio: c.area_ratio,
              societySimilarity: c.society_similarity,
              floorMatch: c.floor_match,
              totalFloorsMatch: c.total_floors_match,
              bathroomsMatch: c.bathrooms_match,
              furnishingMatch: c.furnishing_match,
              depositRatio: c.deposit_ratio,
            },
            weights,
          ),
        }))
        .filter((c) => c.score >= threshold)
        .sort((a, b) => b.score - a.score);

      const current = target.property_id;
      const touched = new Set<string>();
      let next: string;

      if (matches.length > 0) {
        const best = matches[0]!;
        if (current && matches.some((m) => m.property_id === current)) {
          next = current;
        } else if (best.property_id) {
          next = best.property_id;
        } else {
          next = await createProperty(tx);
          summary.created += 1;
          await tx`UPDATE listings SET property_id = ${next} WHERE id = ${best.id}`;
        }
        summary.grouped += 1;
      } else {
        const [others] = current
          ? await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM listings WHERE property_id = ${current} AND id <> ${id}`
          : [{ n: 0 }];
        if (current && others!.n === 0) {
          next = current;
        } else {
          next = await createProperty(tx);
          summary.created += 1;
        }
      }

      if (next === current) {
        summary.unchanged += 1;
      } else {
        await tx`UPDATE listings SET property_id = ${next} WHERE id = ${id}`;
        if (current) {
          summary.moved += 1;
          touched.add(current);
        }
      }
      touched.add(next);

      for (const p of touched) {
        if ((await refreshProperty(tx, p)) === 'removed') summary.propertiesRemoved += 1;
      }
    });
  }

  return summary;
}
