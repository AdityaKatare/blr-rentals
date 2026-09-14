export const SOURCE_SLUGS = ['nobroker', 'magicbricks', 'housing', 'ninetynineacres'] as const;
export type SourceSlug = (typeof SOURCE_SLUGS)[number];

export const PROPERTY_TYPES = [
  'apartment',
  'independent_house',
  'villa',
  'builder_floor',
  'penthouse',
  'studio',
  'pg',
  'other',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const FURNISHINGS = ['unfurnished', 'semi', 'full', 'unknown'] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

export const PARKINGS = ['none', 'bike', 'car', 'both', 'unknown'] as const;
export type Parking = (typeof PARKINGS)[number];

export const TENANT_PREFERENCES = ['family', 'bachelor', 'company', 'any', 'unknown'] as const;
export type TenantPreference = (typeof TENANT_PREFERENCES)[number];

export const LISTED_BY = ['owner', 'broker', 'builder', 'unknown'] as const;
export type ListedBy = (typeof LISTED_BY)[number];

export const GEO_ACCURACIES = ['exact', 'approximate', 'locality_centroid', 'none'] as const;
export type GeoAccuracy = (typeof GEO_ACCURACIES)[number];

export const LISTING_STATUSES = ['active', 'stale', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Canonical amenity tokens. Sources map their own labels/codes onto these (see normalize/amenities.ts). */
export const AMENITIES = [
  'lift',
  'gym',
  'pool',
  'power_backup',
  'security',
  'park',
  'clubhouse',
  'gated',
  'intercom',
  'rainwater_harvesting',
  'stp',
  'wifi',
  'servant_room',
  'ac',
  'visitor_parking',
  'fire_safety',
  'shopping_centre',
  'house_keeping',
  'pet_friendly',
] as const;
export type Amenity = (typeof AMENITIES)[number];
