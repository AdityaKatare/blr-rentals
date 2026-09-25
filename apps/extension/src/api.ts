import type { SearchHit } from '@blr/db';

export const SITE = 'https://blrflathunt.vercel.app';
export const LOOKUP_URL = `${SITE}/api/lookup`;

export type Portal = 'nobroker' | 'magicbricks';

export interface PortalListing {
  source: Portal;
  id: string;
}

export interface LookupRequest {
  type: 'lookup';
  source: Portal;
  id: string;
}

export interface LookupBody {
  listing: SearchHit;
  lastSeenAt: string;
}

export type LookupResponse =
  | { kind: 'found'; listing: SearchHit; lastSeenAt: string }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };
