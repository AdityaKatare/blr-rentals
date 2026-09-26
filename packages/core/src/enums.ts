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

export const TENANT_FILTERS = ['family', 'bachelor', 'company'] as const;
export type TenantFilter = (typeof TENANT_FILTERS)[number];

export const DEPOSIT_MONTHS_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export type DepositMonths = (typeof DEPOSIT_MONTHS_OPTIONS)[number];

export const LISTED_BY = ['owner', 'broker', 'builder', 'unknown'] as const;
export type ListedBy = (typeof LISTED_BY)[number];

export const GEO_ACCURACIES = ['exact', 'approximate', 'locality_centroid', 'none'] as const;
export type GeoAccuracy = (typeof GEO_ACCURACIES)[number];

export const LISTING_STATUSES = ['active', 'stale', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const SORT_OPTIONS = [
  'relevance',
  'distance',
  'rent_asc',
  'rent_desc',
  'movein_asc',
  'movein_desc',
  'newest',
  'near_cheap',
  'cheap_near',
  'new_cheap',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

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

export const METRO_LINES = ['purple', 'green', 'yellow', 'pink', 'blue'] as const;
export type MetroLine = (typeof METRO_LINES)[number];

export const METRO_STATION_STATUSES = ['open', 'upcoming'] as const;
export type MetroStationStatus = (typeof METRO_STATION_STATUSES)[number];
