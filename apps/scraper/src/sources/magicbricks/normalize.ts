import type { NormalizedListing } from '@blr/core';
import { NotImplementedError } from '../../errors';
import type { NormalizeContext, RawListing } from '../types';

/**
 * TODO(M3): map a MagicBricks `searchResult[]` item to NormalizedListing.
 * Field mapping (verified 2026-09-13):
 *   id                    → sourceListingId
 *   url                   → sourceUrl = MAGICBRICKS_BASE + '/propertyDetails/' + url
 *   price                 → rent
 *   maintenanceCharges    → maintenance (parseRupees)
 *   bd (code) / url text  → bedrooms via code table or parseBedrooms('2-BHK')
 *   ba                    → bathrooms
 *   caSqFt, carpetArea    → areaSqft, carpetAreaSqft
 *   furnishedD            → normalizeFurnishing()
 *   ty (code) / url text  → propertyType (Multistorey-Apartment → apartment, …)
 *   floorNo               → floor
 *   lmtDName, ctName      → locality, city
 *   prjname               → societyName
 *   pmtLat, pmtLong       → lat, lng, geoAccuracy 'approximate'
 *   postDateT, lastAccessDate → postedAt, sourceUpdatedAt
 *   possStatusD 'Immediately' → availableFrom = today
 *   bachelor              → tenantPreference (decode D/Y/N)
 *   pl / isPaidUser / companyname present → listedBy broker, else owner
 *   ctVerifd              → isVerified
 *   dtldesc               → description
 *   imgCt, dImgSrc, allImgPath → images (derive URL scheme)
 *   raw                   → stripPii(rest)
 */
export function normalizeMagicbricks(_raw: RawListing, _ctx: NormalizeContext): NormalizedListing {
  throw new NotImplementedError('magicbricks.normalize', 'M3');
}
