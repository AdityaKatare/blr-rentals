import type { SearchHit } from '@blr/db';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function rupees(n: number): string {
  if (n >= 100_000) {
    const lakhs = n / 100_000;
    return `₹${lakhs.toFixed(lakhs >= 10 ? 0 : 1).replace(/\.0$/, '')} L`;
  }
  return `₹${inr.format(n)}`;
}

export function bhk(hit: Pick<SearchHit, 'bedrooms' | 'is1rk' | 'bedroomsPlus'>): string {
  if (hit.is1rk) return '1 RK';
  return `${hit.bedrooms}${hit.bedroomsPlus ? '+' : ''} BHK`;
}

export function km(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function ago(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function availability(isoDate: string, now: Date = new Date()): string {
  const today = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
  if (isoDate <= today) return 'Available now';
  const date = new Date(`${isoDate}T00:00:00+05:30`);
  return `Available ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`;
}

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

export const humanize = (s: string): string => s.replace(/_/g, ' ');
