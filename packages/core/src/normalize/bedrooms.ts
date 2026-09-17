export interface Bedrooms {
  bedrooms: number;
  is1rk: boolean;
  bedroomsPlus: boolean;
}

export function formatBedrooms(b: Bedrooms): string {
  if (b.is1rk) return '1 RK';
  return `${b.bedrooms}${b.bedroomsPlus ? '+' : ''} BHK`;
}

export function parseBedrooms(input: unknown): Bedrooms | null {
  if (typeof input === 'number') {
    return Number.isInteger(input) && input >= 0 && input <= 20
      ? { bedrooms: input, is1rk: false, bedroomsPlus: false }
      : null;
  }
  if (typeof input !== 'string') return null;
  const s = input.toLowerCase().replace(/[\s_-]/g, '');

  if (/^(1?rk|rk1|studio)$/.test(s)) return { bedrooms: 0, is1rk: true, bedroomsPlus: false };

  const m = /^(?:bhk)?(\d{1,2})(\+|plus)?(?:bhk)?(\+|plus)?$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n > 20) return null;
  return { bedrooms: n, is1rk: false, bedroomsPlus: Boolean(m[2] ?? m[3]) };
}
