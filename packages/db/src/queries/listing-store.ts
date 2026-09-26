import { createHash } from 'node:crypto';
import type { NormalizedListing, SourceSlug } from '@blr/core';
import type { Sql } from '../client';
import { geographyPoint, inTransaction } from '../sql';
import type { ListingStore, UpsertSummary } from '../types';
import { refreshListingNearby } from './listing-nearby';
import { resolveSourceId } from './sources';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function listingHash(listing: NormalizedListing): string {
  const { raw: _raw, ...content } = listing;
  return createHash('sha256').update(stableStringify(content)).digest('hex');
}

interface ExistingRow {
  id: string;
  raw_hash: string;
  rent: number;
  deposit: number | null;
  available_from: string | null;
  status: 'active' | 'stale' | 'removed';
}

type Change = { field: string; old: unknown; new: unknown };

export function trackedChanges(existing: ExistingRow, next: NormalizedListing): Change[] {
  const changes: Change[] = [];
  if (existing.rent !== next.rent) changes.push({ field: 'rent', old: existing.rent, new: next.rent });
  if (existing.deposit !== next.deposit) changes.push({ field: 'deposit', old: existing.deposit, new: next.deposit });
  if (existing.available_from !== next.availableFrom) {
    changes.push({ field: 'available_from', old: existing.available_from, new: next.availableFrom });
  }
  if (existing.status !== 'active') changes.push({ field: 'status', old: existing.status, new: 'active' });
  return changes;
}

function listingValues(s: Sql, sourceId: number, l: NormalizedListing, hash: string) {
  const location =
    l.lat !== null && l.lng !== null ? geographyPoint(s, l.lat, l.lng) : s`NULL::geography`;
  return s`
    ${sourceId}, ${l.sourceListingId}, ${l.sourceUrl},
    ${l.title}, ${l.description}, ${l.propertyType}::property_type,
    ${l.bedrooms}, ${l.is1rk}, ${l.bedroomsPlus}, ${l.bathrooms}::smallint, ${l.balconies}::smallint,
    ${l.rent}, ${l.deposit}::integer, ${l.maintenance}::integer, ${l.maintenanceIncluded}::boolean,
    ${l.areaSqft}::integer, ${l.carpetAreaSqft}::integer, ${l.floor}::smallint, ${l.totalFloors}::smallint,
    ${l.furnishing}::furnishing, ${l.parking}::parking, ${l.tenantPreference}::tenant_preference, ${l.listedBy}::listed_by,
    ${l.locality}, ${l.subLocality}, ${l.city}, ${l.pincode}, ${l.societyName},
    ${location}, ${l.geoAccuracy}::geo_accuracy,
    ${`{${l.amenities.join(',')}}`}::text[], ${JSON.stringify(l.images)}::jsonb, ${l.isVerified}, ${l.isSponsored},
    ${l.availableFrom}::date, ${l.postedAt}::timestamptz, ${l.sourceUpdatedAt}::timestamptz,
    ${JSON.stringify(l.raw)}::jsonb, ${hash}`;
}

const COLUMNS = `source_id, source_listing_id, source_url,
  title, description, property_type,
  bedrooms, is_1rk, bedrooms_plus, bathrooms, balconies,
  rent, deposit, maintenance, maintenance_included,
  area_sqft, carpet_area_sqft, floor, total_floors,
  furnishing, parking, tenant_preference, listed_by,
  locality, sub_locality, city, pincode, society_name,
  location, geo_accuracy,
  amenities, images, is_verified, is_sponsored,
  available_from, posted_at, source_updated_at,
  raw, raw_hash`;


export function createListingStore(sql: Sql): ListingStore {
  const sourceIds = new Map<SourceSlug, number>();

  return {
    async upsertMany(listings) {
      const summary: UpsertSummary = { inserted: 0, updated: 0, unchanged: 0, changes: 0, touchedIds: [] };

      const unique = [...new Map(listings.map((l) => [`${l.source}:${l.sourceListingId}`, l])).values()];

      for (const slug of new Set(unique.map((l) => l.source))) {
        if (!sourceIds.has(slug)) sourceIds.set(slug, await resolveSourceId(sql, slug));
      }

      await inTransaction(sql, async (tx) => {
        for (const l of unique) {
          const sourceId = sourceIds.get(l.source)!;
          const hash = listingHash(l);
          const [existing] = await tx<ExistingRow[]>`
            SELECT id, raw_hash, rent, deposit, available_from::text AS available_from, status
            FROM listings
            WHERE source_id = ${sourceId} AND source_listing_id = ${l.sourceListingId}
            FOR UPDATE`;

          if (!existing) {
            const [row] = await tx<{ id: string }[]>`
              INSERT INTO listings (${tx.unsafe(COLUMNS)})
              VALUES (${listingValues(tx, sourceId, l, hash)})
              RETURNING id`;
            summary.inserted += 1;
            summary.touchedIds.push(row!.id);
            continue;
          }

          if (existing.raw_hash === hash && existing.status === 'active') {
            await tx`UPDATE listings SET last_seen_at = now() WHERE id = ${existing.id}`;
            summary.unchanged += 1;
            continue;
          }

          const changes = trackedChanges(existing, l);
          await tx`
            UPDATE listings
            SET (${tx.unsafe(COLUMNS)}) = (${listingValues(tx, sourceId, l, hash)}),
                status = 'active', removed_at = NULL, last_seen_at = now(), updated_at = now()
            WHERE id = ${existing.id}`;
          for (const c of changes) {
            await tx`
              INSERT INTO listing_changes (listing_id, field, old_value, new_value)
              VALUES (${existing.id}, ${c.field}, ${JSON.stringify(c.old)}::jsonb, ${JSON.stringify(c.new)}::jsonb)`;
          }
          summary.updated += 1;
          summary.changes += changes.length;
          summary.touchedIds.push(existing.id);
        }
      });

      await refreshListingNearby(sql, { listingIds: summary.touchedIds });
      return summary;
    },
  };
}
