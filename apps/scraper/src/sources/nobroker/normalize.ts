import {
  amenitiesFromFlags,
  normalizeFurnishing,
  parseBedrooms,
  type Image,
  type NormalizedListingInput,
  type Parking,
  type PropertyType,
  type TenantPreference,
} from '@blr/core';
import { redactContactText } from '../pii';
import { societyName } from '../society';
import type { NormalizeContext, RawListing } from '../types';

const BASE = 'https://www.nobroker.in';
const IMAGE_BASE = 'https://assets.nobroker.in/images';

const BUILDING_TYPES: Record<string, PropertyType> = {
  AP: 'apartment',
  IH: 'independent_house',
  IF: 'builder_floor',
  GC: 'villa',
};

const PARKING: Record<string, Parking> = {
  NONE: 'none',
  TWO_WHEELER: 'bike',
  FOUR_WHEELER: 'car',
  BOTH: 'both',
};

const TENANTS: Record<string, TenantPreference> = {
  FAMILY: 'family',
  BACHELOR: 'bachelor',
  BACHELOR_MALE: 'bachelor',
  BACHELOR_FEMALE: 'bachelor',
  COMPANY: 'company',
  ANYONE: 'any',
  ANY: 'any',
};

const RAW_DROP = new Set([
  'photos',
  'seoDescription',
  'highLights',
  'breadcrumbUrls',
  'nudges',
  'score',
  'videoUnit',
  'amenitiesMap',
  'aea__',
  'propertyTitleTruncated',
  'localityTruncated',
  'url',
  'contactedStatusDetails',
  'shortlistedByLoggedInUser',
]);

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const SENTINEL = /^(not[_\s]?found|null|undefined|unknown|n\/?a)$/i;
const place = (v: unknown): string | null => {
  const s = str(v);
  return s && !SENTINEL.test(s) ? s : null;
};
const int = (v: unknown, min = 0): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.round(v) : null;
const epochToIso = (v: unknown): string | null => (typeof v === 'number' && v > 0 ? new Date(v).toISOString() : null);

const epochToIstDate = (v: unknown): string | null => {
  if (typeof v !== 'number' || v <= 0) return null;
  return new Date(v + 5.5 * 3600_000).toISOString().slice(0, 10);
};

function parseAmenities(raw: RawListing) {
  if (raw.amenitiesMap && typeof raw.amenitiesMap === 'object') {
    return amenitiesFromFlags(raw.amenitiesMap as Record<string, unknown>);
  }
  if (typeof raw.amenities === 'string') {
    try {
      const flags: unknown = JSON.parse(raw.amenities);
      if (flags && typeof flags === 'object') return amenitiesFromFlags(flags as Record<string, unknown>);
    } catch {
      return [];
    }
  }
  return [];
}

function parseImages(raw: RawListing, id: string): Image[] {
  if (!Array.isArray(raw.photos)) return [];
  const images: Image[] = [];
  for (const photo of raw.photos) {
    if (!photo || typeof photo !== 'object') continue;
    const map = (photo as { imagesMap?: Record<string, unknown> }).imagesMap;
    const file = str(map?.large) ?? str(map?.medium) ?? str(map?.original);
    if (!file) continue;
    images.push({ url: `${IMAGE_BASE}/${id}/${file}`, isCover: (photo as { displayPic?: unknown }).displayPic === true });
  }
  return images.slice(0, 20);
}

export function normalizeNobroker(raw: RawListing, _ctx: NormalizeContext): NormalizedListingInput {
  const id = str(raw.id);
  if (!id) throw new Error('nobroker: listing without id');
  const detailUrl = str(raw.detailUrl);
  if (!detailUrl) throw new Error(`nobroker ${id}: missing detailUrl`);

  const bedrooms = parseBedrooms(raw.type);
  if (!bedrooms) throw new Error(`nobroker ${id}: unrecognised type ${JSON.stringify(raw.type)}`);

  const lat = typeof raw.latitude === 'number' ? raw.latitude : null;
  const lng = typeof raw.longitude === 'number' ? raw.longitude : null;
  const hasGeo = lat !== null && lng !== null && !(lat === 0 && lng === 0);

  const maintenanceAmount = int(raw.maintenanceAmount);
  const description = str(raw.ownerDescription) ?? str(raw.description);
  const pincode = raw.pinCode === undefined || raw.pinCode === null ? null : String(raw.pinCode).trim();

  const rawKept: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) if (!RAW_DROP.has(k)) rawKept[k] = v;

  return {
    source: 'nobroker',
    sourceListingId: id,
    sourceUrl: new URL(detailUrl, BASE).toString(),

    title: str(raw.propertyTitle) ?? str(raw.title) ?? `${bedrooms.is1rk ? '1 RK' : `${bedrooms.bedrooms} BHK`} for rent`,
    description: description ? redactContactText(description).slice(0, 2000) : null,
    propertyType: (typeof raw.buildingType === 'string' && BUILDING_TYPES[raw.buildingType]) || 'other',
    ...bedrooms,
    bathrooms: int(raw.bathroom),
    balconies: int(raw.balconies),

    rent: int(raw.rent, 1) ?? 0,
    deposit: int(raw.deposit),
    maintenance: maintenanceAmount !== null && maintenanceAmount >= 100 ? maintenanceAmount : null,
    maintenanceIncluded: typeof raw.maintenanceIncluded === 'boolean' ? raw.maintenanceIncluded : null,

    areaSqft: int(raw.propertySize, 1),
    floor: typeof raw.floor === 'number' && Number.isInteger(raw.floor) ? raw.floor : null,
    totalFloors: int(raw.totalFloor),

    furnishing: normalizeFurnishing(raw.furnishing),
    parking: (typeof raw.parking === 'string' && PARKING[raw.parking]) || 'unknown',
    tenantPreference: (typeof raw.leaseType === 'string' && TENANTS[raw.leaseType]) || 'unknown',
    listedBy: 'owner',

    locality: place(raw.nbLocality) ?? place(raw.locality),
    subLocality: place(raw.street),
    city: 'Bengaluru',
    pincode: pincode && /^\d{6}$/.test(pincode) ? pincode : null,
    societyName: societyName(raw.society),

    lat: hasGeo ? lat : null,
    lng: hasGeo ? lng : null,
    geoAccuracy: hasGeo ? (raw.accurateLocation === true ? 'exact' : 'approximate') : 'none',

    amenities: parseAmenities(raw),
    images: parseImages(raw, id),
    isVerified: raw.listingVerified === true,
    isSponsored: raw.sponsored === true || raw.premium === true,

    availableFrom: epochToIstDate(raw.availableFrom),
    postedAt: epochToIso(raw.creationDate),
    sourceUpdatedAt: epochToIso(raw.lastUpdateDate),

    raw: rawKept,
  };
}
