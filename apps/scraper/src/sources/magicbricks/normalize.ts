import {
  normalizeAmenities,
  normalizeFurnishing,
  parseBedrooms,
  type Amenity,
  type GeoAccuracy,
  type Image,
  type ListedBy,
  type NormalizedListingInput,
  type Parking,
  type PropertyType,
  type TenantPreference,
} from '@blr/core';
import { redactContactText } from '../pii';
import { societyName } from '../society';
import type { NormalizeContext, RawListing } from '../types';

const BASE = 'https://www.magicbricks.com';

const TYPE_CODES: Record<string, PropertyType> = {
  '10001': 'independent_house',
  '10002': 'apartment',
  '10003': 'builder_floor',
  '10017': 'villa',
};

const TYPE_LABELS: Array<[RegExp, PropertyType]> = [
  [/studio/i, 'studio'],
  [/penthouse/i, 'penthouse'],
  [/builder\s*floor/i, 'builder_floor'],
  [/villa/i, 'villa'],
  [/(residential|independent)\s*house/i, 'independent_house'],
  [/apartment|flat/i, 'apartment'],
];

const AMENITY_CODES: Record<string, Amenity> = {
  '12201': 'power_backup',
  '12202': 'lift',
  '12203': 'rainwater_harvesting',
  '12204': 'clubhouse',
  '12205': 'pool',
  '12207': 'park',
  '12209': 'security',
  '12215': 'ac',
  '12216': 'visitor_parking',
  '12217': 'intercom',
  '12221': 'wifi',
};

const LISTED_BY: Record<string, ListedBy> = {
  owner: 'owner',
  agent: 'broker',
  builder: 'builder',
};

const MAINTENANCE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  'half yearly': 6,
  yearly: 12,
  annually: 12,
};

const RAW_KEEP = [
  'id',
  'encId',
  'url',
  'price',
  'bookingAmtExact',
  'maintenanceCharges',
  'maintenanceD',
  'bd',
  'bedroomD',
  'bathD',
  'balconiesD',
  'ty',
  'propTypeD',
  'furnished',
  'furnishedD',
  'floorNo',
  'floors',
  'floorD',
  'caSqFt',
  'coverAreaUnitD',
  'carpetArea',
  'carpAreaUnit',
  'lmtDName',
  'lt',
  'prjname',
  'psmid',
  'pmtLat',
  'pmtLong',
  'ltcoordGeo',
  'postDateT',
  'lastAccessDate',
  'avlAfter',
  'possStatusD',
  'tenantsPreference',
  'bachelor',
  'userType',
  'parkingD',
  'facingD',
  'acD',
  'amenities',
  'ctVerifd',
  'imgCt',
  'propertyTitle',
];

const CENTROID_TOLERANCE_DEG = 0.0003;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/,/g, '')) : NaN;
  return Number.isFinite(n) ? n : null;
};

const int = (v: unknown, min = 0): number | null => {
  const n = num(v);
  return n !== null && n >= min ? Math.round(n) : null;
};

const iso = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const istDate = (isoString: string): string => new Date(Date.parse(isoString) + 5.5 * 3600_000).toISOString().slice(0, 10);

function propertyType(raw: RawListing): PropertyType {
  const label = str(raw.propTypeD);
  if (label) for (const [re, type] of TYPE_LABELS) if (re.test(label)) return type;
  return TYPE_CODES[String(raw.ty)] ?? 'other';
}

function floor(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  if (/^ground$/i.test(s)) return 0;
  if (/basement/i.test(s)) return -1;
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

function tenantPreference(v: unknown): TenantPreference {
  const s = str(v)?.toLowerCase() ?? '';
  const bachelor = s.includes('bachelor');
  const family = s.includes('family');
  if (bachelor && family) return 'any';
  if (bachelor) return 'bachelor';
  if (family) return 'family';
  if (s.includes('company')) return 'company';
  return 'unknown';
}

function parking(v: unknown): Parking {
  const s = str(v);
  if (!s) return 'unknown';
  if (/^none$/i.test(s)) return 'none';
  const spaces = [...s.matchAll(/(\d+)\s*(covered|open)/gi)].reduce((sum, m) => sum + Number(m[1]), 0);
  return spaces > 0 ? 'car' : 'unknown';
}

function maintenance(raw: RawListing): number | null {
  const amount = num(raw.maintenanceCharges);
  if (amount === null) return null;
  const period = str(raw.maintenanceD)?.toLowerCase().replace(/[-_]/g, ' ');
  const months = period ? MAINTENANCE_MONTHS[period] : 1;
  if (!months) return null;
  const monthly = Math.round(amount / months);
  return monthly >= 100 ? monthly : null;
}

function amenities(raw: RawListing): Amenity[] {
  const codes = str(raw.amenities)?.split(/[\s,]+/) ?? [];
  const labels: string[] = [];
  for (const key of ['luxAmenMap', 'nonluxAmenMap']) {
    const map = raw[key];
    if (map && typeof map === 'object') {
      for (const [code, label] of Object.entries(map as Record<string, unknown>)) {
        if (typeof label === 'string' && codes.includes(code)) labels.push(label);
      }
    }
  }
  const fromCodes = codes.map((c) => AMENITY_CODES[c]).filter((a): a is Amenity => Boolean(a));
  return normalizeAmenities([...fromCodes, ...labels]);
}

function geo(raw: RawListing): { lat: number | null; lng: number | null; geoAccuracy: GeoAccuracy } {
  const lat = num(raw.pmtLat);
  const lng = num(raw.pmtLong);
  const centroid = str(raw.ltcoordGeo)?.split(',').map(Number);
  const centroidOk = centroid?.length === 2 && centroid.every((n) => Number.isFinite(n) && n !== 0);
  const pinOk = lat !== null && lng !== null && lat !== 0 && lng !== 0;

  const onCentroid = centroidOk && pinOk && Math.abs(lat - centroid![0]!) < CENTROID_TOLERANCE_DEG && Math.abs(lng - centroid![1]!) < CENTROID_TOLERANCE_DEG;
  if (pinOk && !onCentroid) {
    return { lat, lng, geoAccuracy: 'approximate' };
  }
  if (centroidOk) return { lat: centroid![0]!, lng: centroid![1]!, geoAccuracy: 'locality_centroid' };
  return { lat: null, lng: null, geoAccuracy: 'none' };
}

function images(raw: RawListing): Image[] {
  const urls = Array.isArray(raw.allImgPath) ? raw.allImgPath : [raw.image];
  return urls
    .map(str)
    .filter((u): u is string => u !== null && /^https:\/\//.test(u))
    .slice(0, 20)
    .map((url, i) => ({ url, isCover: i === 0 }));
}

function availableFrom(raw: RawListing, postedAt: string | null): string | null {
  const after = str(raw.avlAfter);
  if (after && /^\d{4}-\d{2}-\d{2}/.test(after)) return after.slice(0, 10);
  if (/^immediate/i.test(str(raw.possStatusD) ?? '') && postedAt) return istDate(postedAt);
  return null;
}

export function normalizeMagicbricks(raw: RawListing, _ctx: NormalizeContext): NormalizedListingInput {
  const id = raw.id === undefined || raw.id === null ? null : String(raw.id).trim();
  if (!id) throw new Error('magicbricks: listing without id');
  const path = str(raw.url);
  if (!path) throw new Error(`magicbricks ${id}: missing url`);

  const type = propertyType(raw);
  const bedrooms = type === 'studio' ? parseBedrooms('1rk') : parseBedrooms(str(raw.bedroomD));
  if (!bedrooms) throw new Error(`magicbricks ${id}: unrecognised bedrooms ${JSON.stringify(raw.bedroomD)}`);

  const description = str(raw.dtldesc);
  const postedAt = iso(raw.postDateT);
  const carpetUnit = str(raw.carpAreaUnit);
  const carpetSqft = !carpetUnit || /sq\W*ft/i.test(carpetUnit) ? int(raw.carpetArea, 1) : null;

  const rawKept: Record<string, unknown> = {};
  for (const k of RAW_KEEP) if (raw[k] !== undefined) rawKept[k] = raw[k];

  return {
    source: 'magicbricks',
    sourceListingId: id,
    sourceUrl: new URL(`/propertyDetails/${path.replace(/^\/?(propertyDetails\/)?/, '')}`, BASE).toString(),

    title: str(raw.propertyTitle) ?? `${bedrooms.is1rk ? '1 RK' : `${bedrooms.bedrooms} BHK`} for rent`,
    description: description ? redactContactText(description).slice(0, 2000) : null,
    propertyType: type,
    ...bedrooms,
    bathrooms: int(raw.bathD),
    balconies: int(raw.balconiesD),

    rent: int(raw.price, 1) ?? 0,
    deposit: int(raw.bookingAmtExact, 1),
    maintenance: maintenance(raw),
    maintenanceIncluded: null,

    areaSqft: int(raw.caSqFt, 1) ?? carpetSqft,
    carpetAreaSqft: carpetSqft,
    floor: floor(raw.floorNo),
    totalFloors: int(raw.floors),

    furnishing: normalizeFurnishing(raw.furnishedD),
    parking: parking(raw.parkingD),
    tenantPreference: tenantPreference(raw.tenantsPreference),
    listedBy: LISTED_BY[str(raw.userType)?.toLowerCase() ?? ''] ?? 'unknown',

    locality: str(raw.lmtDName),
    subLocality: null,
    city: 'Bengaluru',
    pincode: null,
    societyName: societyName(raw.prjname),

    ...geo(raw),

    amenities: amenities(raw),
    images: images(raw),
    isVerified: raw.ctVerifd === 'Y',
    isSponsored: false,

    availableFrom: availableFrom(raw, postedAt),
    postedAt,
    sourceUpdatedAt: iso(raw.lastAccessDate),

    raw: rawKept,
  };
}
