import type { Furnishing } from '../enums';

const ALIASES: Record<string, Furnishing> = {
  fully_furnished: 'full',
  fullyfurnished: 'full',
  'fully furnished': 'full',
  'fully-furnished': 'full',
  furnished: 'full',
  full: 'full',
  semi_furnished: 'semi',
  semifurnished: 'semi',
  'semi furnished': 'semi',
  'semi-furnished': 'semi',
  semi: 'semi',
  not_furnished: 'unfurnished',
  unfurnished: 'unfurnished',
  'un-furnished': 'unfurnished',
  'not furnished': 'unfurnished',
  bare: 'unfurnished',
};

export function normalizeFurnishing(input: unknown): Furnishing {
  if (typeof input !== 'string') return 'unknown';
  return ALIASES[input.trim().toLowerCase()] ?? 'unknown';
}
