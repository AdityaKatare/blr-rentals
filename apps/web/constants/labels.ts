import type { MetroLine, NearMetroM, SortOption } from '@blr/core';

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

export const NEAR_METRO_LABELS: Record<NearMetroM, string> = {
  500: '500 m',
  1000: '1 km',
  1500: '1.5 km',
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
  rent_asc: 'Rent: low to high',
  distance: 'Nearest',
  newest: 'Recently updated',
};
