import type { NormalizedListing } from '@blr/core';
import { NotImplementedError } from '../../errors';
import type { NormalizeContext, RawListing } from '../types';

/**
 * TODO(M2): map a NoBroker listing object to NormalizedListing.
 * Field mapping (verified 2026-09-13):
 *   id                          → sourceListingId
 *   detailUrl                   → sourceUrl (prefix NOBROKER_BASE)
 *   title / secondaryTitle      → title
 *   type BHK2 / RK1 / BHK4PLUS  → parseBedrooms()
 *   buildingType AP/IH/IF/GC    → propertyType apartment/independent_house/builder_floor/villa
 *   rent, deposit               → rent, deposit
 *   maintenance (bool),
 *   formattedMaintenanceAmount  → maintenanceIncluded, maintenance (parseRupees)
 *   propertySize                → areaSqft
 *   floor, totalFloor           → floor, totalFloors
 *   furnishing                  → normalizeFurnishing()
 *   parking NONE/TWO_WHEELER/FOUR_WHEELER/BOTH → none/bike/car/both
 *   leaseType FAMILY/BACHELOR/COMPANY/ANY     → tenantPreference
 *   bathroom, balconies         → bathrooms, balconies
 *   locality, street, society   → locality, subLocality, societyName
 *   latitude, longitude,
 *   accurateLocation            → lat, lng, geoAccuracy exact|approximate
 *   amenities (JSON string)     → JSON.parse → amenitiesFromFlags()
 *   availableFrom (epoch ms)    → availableFrom (YYYY-MM-DD)
 *   creationDate, lastUpdateDate→ postedAt, sourceUpdatedAt (ISO)
 *   photos[].imagesMap          → images (image host to confirm)
 *   sponsored / premium         → isSponsored
 *   listedBy                    → 'owner' (NoBroker is owner-only)
 *   raw                         → stripPii(rest) minus photos/seoDescription
 */
export function normalizeNobroker(_raw: RawListing, _ctx: NormalizeContext): NormalizedListing {
  throw new NotImplementedError('nobroker.normalize', 'M2');
}
