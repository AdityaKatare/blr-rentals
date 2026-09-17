import { DESCRIPTION_MAX_LENGTH, formatBedrooms, type Bedrooms } from '@blr/core';
import { redactContactText } from './pii';

export const MAX_LISTING_IMAGES = 20;
export const MIN_MONTHLY_MAINTENANCE = 100;

export const fallbackTitle = (bedrooms: Bedrooms): string => `${formatBedrooms(bedrooms)} for rent`;

export const listingDescription = (text: string | null): string | null =>
  text ? redactContactText(text).slice(0, DESCRIPTION_MAX_LENGTH) : null;

export const plausibleMaintenance = (monthly: number | null): number | null =>
  monthly !== null && monthly >= MIN_MONTHLY_MAINTENANCE ? monthly : null;
