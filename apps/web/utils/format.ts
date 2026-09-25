import { DAY_MS, formatBedrooms, istDate } from '@blr/core';
import { NEW_LISTING_DAYS } from '@/constants/search';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function rupees(n: number): string {
  if (n >= 100_000) {
    const lakhs = n / 100_000;
    return `₹${lakhs.toFixed(lakhs >= 10 ? 0 : 1).replace(/\.0$/, '')} L`;
  }
  return `₹${inr.format(n)}`;
}

export function shortRupees(n: number): string {
  if (n >= 100_000) {
    const lakhs = n / 100_000;
    return `${lakhs.toFixed(lakhs >= 10 ? 0 : 1).replace(/\.0$/, '')}L`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function formatDistance(meters: number): string {
  const rounded = Math.max(10, Math.round(meters / 10) * 10);
  return rounded < 1000 ? `${rounded} m` : `${(rounded / 1000).toFixed(1)} km`;
}

export function timeAgo(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const days = Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function isNewListing(postedAt: string | null, now: Date = new Date()): boolean {
  if (!postedAt) return false;
  const age = now.getTime() - Date.parse(postedAt);
  return age >= -DAY_MS && age <= NEW_LISTING_DAYS * DAY_MS;
}

export function shortDate(isoDate: string): string | null {
  const date = new Date(`${isoDate}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

export function availability(isoDate: string, now: Date = new Date()): string {
  if (isoDate <= istDate(now.getTime())) return 'Available now';
  return `Available ${shortDate(isoDate) ?? isoDate}`;
}

export const humanize = (s: string): string => s.replace(/_/g, ' ');

export const sizeLabel = (bedrooms: number): string =>
  formatBedrooms({ bedrooms, is1rk: bedrooms === 0, bedroomsPlus: false });
