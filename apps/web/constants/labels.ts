import type { SortOption } from '@blr/core';

export const SOURCE_LABELS: Record<string, string> = {
  nobroker: 'NoBroker',
  magicbricks: 'MagicBricks',
  housing: 'Housing.com',
  ninetynineacres: '99acres',
};

export const SOURCE_STYLES: Record<string, string> = {
  nobroker: 'bg-rose-50 text-rose-700 ring-rose-200',
  magicbricks: 'bg-red-50 text-red-800 ring-red-200',
  housing: 'bg-violet-50 text-violet-700 ring-violet-200',
  ninetynineacres: 'bg-sky-50 text-sky-700 ring-sky-200',
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

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  rent_asc: 'Rent: low to high',
  distance: 'Nearest',
  newest: 'Recently updated',
};
