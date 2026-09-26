import type { MetroLine, PoiCategory, PoiCategoryGroup, SortOption, TenantFilter, TenantPreference } from '@blr/core';

export const SOURCE_LABELS: Record<string, string> = {
  nobroker: 'NoBroker',
  magicbricks: 'MagicBricks',
  housing: 'Housing.com',
  ninetynineacres: '99acres',
};

export const FURNISHING_LABELS: Record<string, string> = {
  full: 'Fully furnished',
  semi: 'Semi-furnished',
  unfurnished: 'Unfurnished',
  unknown: '',
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartment',
  independent_house: 'Independent house',
  villa: 'Villa',
  builder_floor: 'Builder floor',
  penthouse: 'Penthouse',
  studio: 'Studio',
  pg: 'PG',
  other: 'Other',
};

export const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  tech_park: 'Tech parks',
  metro: 'Metro',
  railway_station: 'Railway stations',
  bus_stop: 'Bus stops',
  airport: 'Airport',
  major_road: 'Main roads',
  school: 'Schools',
  college: 'Colleges',
  hospital: 'Hospitals',
  mall: 'Malls',
  supermarket: 'Supermarkets',
  restaurant: 'Restaurants & cafes',
  gym: 'Gyms',
  park: 'Parks',
};

export const POI_CATEGORY_NOUNS: Record<PoiCategory, string> = {
  tech_park: 'tech park',
  metro: 'metro',
  railway_station: 'railway station',
  bus_stop: 'bus stop',
  airport: 'airport',
  major_road: 'main road',
  school: 'school',
  college: 'college',
  hospital: 'hospital',
  mall: 'mall',
  supermarket: 'supermarket',
  restaurant: 'restaurant or cafe',
  gym: 'gym',
  park: 'park',
};

export const POI_GROUP_LABELS: Record<PoiCategoryGroup, string> = {
  work: 'Work',
  transit: 'Getting around',
  education_health: 'Schools & health',
  daily: 'Everyday',
};

export const METRO_LINE_LABELS: Record<MetroLine, string> = {
  purple: 'Purple Line',
  green: 'Green Line',
  yellow: 'Yellow Line',
  pink: 'Pink Line',
  blue: 'Blue Line',
};

export const METRO_LINE_STYLES: Record<MetroLine, string> = {
  purple: 'bg-purple-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-400',
  pink: 'bg-pink-500',
  blue: 'bg-sky-600',
};

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  distance: 'Nearest',
  rent_asc: 'Lowest rent',
  rent_desc: 'Highest rent',
  movein_asc: 'Lowest move-in',
  movein_desc: 'Highest move-in',
  newest: 'Newest',
  near_cheap: 'Nearest · cheapest',
  cheap_near: 'Cheapest · nearest',
  new_cheap: 'Newest · cheapest',
};

export const TENANT_FILTER_LABELS: Record<TenantFilter, string> = {
  family: 'Families',
  bachelor: 'Bachelors',
  company: 'Company lease',
};

export const TENANT_FILTER_CHIPS: Record<TenantFilter, string> = {
  family: 'Takes families',
  bachelor: 'Takes bachelors',
  company: 'Takes company leases',
};

export const TENANT_PREFERENCE_LABELS: Record<TenantPreference, string> = {
  family: 'Families only',
  bachelor: 'Bachelors welcome',
  company: 'Company lease',
  any: '',
  unknown: '',
};
