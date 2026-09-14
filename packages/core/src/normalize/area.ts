const SQFT_PER_UNIT: Record<string, number> = {
  sqft: 1,
  'sq.ft': 1,
  'sq ft': 1,
  sqf: 1,
  sqm: 10.7639,
  'sq.m': 10.7639,
  'sq m': 10.7639,
  sqmt: 10.7639,
  sqyd: 9,
  'sq.yd': 9,
  'sq yd': 9,
  sqyrd: 9,
  acre: 43560,
  acres: 43560,
};

/** Convert an area to integer square feet. Unknown units or non-positive values → null. */
export function toSqft(value: unknown, unit: string = 'sqft'): number | null {
  const n = typeof value === 'string' ? parseFloat(value.replace(/[,\s]/g, '')) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  const factor = SQFT_PER_UNIT[unit.trim().toLowerCase().replace(/\.$/, '')];
  if (factor === undefined) return null;
  return Math.round(n * factor);
}
