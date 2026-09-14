import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  smallint,
  smallserial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  FURNISHINGS,
  GEO_ACCURACIES,
  LISTED_BY,
  LISTING_STATUSES,
  PARKINGS,
  PROPERTY_TYPES,
  TENANT_PREFERENCES,
  type Image,
  type LatLng,
} from '@blr/core';
import { parseEwkbPoint } from './ewkb';

// Keep in sync with migrations/0000_init.sql. The SQL file is the source of truth
// for the database; this file is the source of truth for TypeScript.

export const transportEnum = pgEnum('transport', ['http', 'browser']);
export const propertyTypeEnum = pgEnum('property_type', PROPERTY_TYPES);
export const furnishingEnum = pgEnum('furnishing', FURNISHINGS);
export const parkingEnum = pgEnum('parking', PARKINGS);
export const tenantPreferenceEnum = pgEnum('tenant_preference', TENANT_PREFERENCES);
export const listedByEnum = pgEnum('listed_by', LISTED_BY);
export const geoAccuracyEnum = pgEnum('geo_accuracy', GEO_ACCURACIES);
export const listingStatusEnum = pgEnum('listing_status', LISTING_STATUSES);
export const runStatusEnum = pgEnum('run_status', ['running', 'ok', 'partial', 'failed']);

/** PostGIS geography(Point,4326). Written via ST_MakePoint(lng, lat); read back from EWKB hex. */
export const geographyPoint = customType<{ data: LatLng; driverData: string }>({
  dataType: () => 'geography(Point,4326)',
  toDriver: (v) => sql`ST_SetSRID(ST_MakePoint(${v.lng}, ${v.lat}), 4326)::geography`,
  fromDriver: (v) => parseEwkbPoint(v),
});

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const emptyTextArray = sql`'{}'::text[]`;

export const sources = pgTable('sources', {
  id: smallserial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  /** Kill switch. Seeds set it once; re-seeding never overrides it. */
  enabled: boolean('enabled').notNull().default(false),
  transport: transportEnum('transport').notNull().default('http'),
  crawlIntervalMin: integer('crawl_interval_min').notNull().default(720),
  minDelayMs: integer('min_delay_ms').notNull().default(2500),
  notes: text('notes'),
  robotsCheckedAt: timestamp('robots_checked_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const localities = pgTable(
  'localities',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    aliases: text('aliases').array().notNull().default(emptyTextArray),
    centroid: geographyPoint('centroid').notNull(),
    centroidAccuracy: geoAccuracyEnum('centroid_accuracy').notNull().default('approximate'),
    sourceRefs: jsonb('source_refs').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('localities_centroid_gix').using('gist', t.centroid),
    index('localities_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`),
  ],
);

export const searchAreas = pgTable(
  'search_areas',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    localityId: integer('locality_id').references(() => localities.id),
    center: geographyPoint('center').notNull(),
    radiusKm: real('radius_km').notNull().default(3),
    enabled: boolean('enabled').notNull().default(true),
    sourceOverrides: jsonb('source_overrides').$type<Record<string, Record<string, unknown>>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('search_areas_center_gix').using('gist', t.center)],
);

/** One row per deduplicated real-world flat. Listings point here via property_id. */
export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** FK to listings(id) is added in SQL (circular reference). */
    canonicalListingId: uuid('canonical_listing_id'),
    location: geographyPoint('location'),
    bedrooms: smallint('bedrooms'),
    areaSqft: integer('area_sqft'),
    rentMin: integer('rent_min'),
    rentMax: integer('rent_max'),
    listingCount: integer('listing_count').notNull().default(0),
    sources: text('sources').array().notNull().default(emptyTextArray),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('properties_location_gix').using('gist', t.location)],
);

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: smallint('source_id')
      .notNull()
      .references(() => sources.id),
    sourceListingId: text('source_listing_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'set null' }),

    title: text('title').notNull(),
    description: text('description'),
    propertyType: propertyTypeEnum('property_type').notNull().default('other'),
    bedrooms: smallint('bedrooms').notNull(),
    is1rk: boolean('is_1rk').notNull().default(false),
    bedroomsPlus: boolean('bedrooms_plus').notNull().default(false),
    bathrooms: smallint('bathrooms'),
    balconies: smallint('balconies'),

    rent: integer('rent').notNull(),
    deposit: integer('deposit'),
    maintenance: integer('maintenance'),
    maintenanceIncluded: boolean('maintenance_included'),

    areaSqft: integer('area_sqft'),
    carpetAreaSqft: integer('carpet_area_sqft'),
    floor: smallint('floor'),
    totalFloors: smallint('total_floors'),

    furnishing: furnishingEnum('furnishing').notNull().default('unknown'),
    parking: parkingEnum('parking').notNull().default('unknown'),
    tenantPreference: tenantPreferenceEnum('tenant_preference').notNull().default('unknown'),
    listedBy: listedByEnum('listed_by').notNull().default('unknown'),

    locality: text('locality'),
    subLocality: text('sub_locality'),
    city: text('city').notNull().default('Bengaluru'),
    pincode: text('pincode'),
    societyName: text('society_name'),

    location: geographyPoint('location'),
    geoAccuracy: geoAccuracyEnum('geo_accuracy').notNull().default('none'),

    amenities: text('amenities').array().notNull().default(emptyTextArray),
    images: jsonb('images').$type<Image[]>().notNull().default([]),
    isVerified: boolean('is_verified').notNull().default(false),
    isSponsored: boolean('is_sponsored').notNull().default(false),

    availableFrom: date('available_from'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),

    raw: jsonb('raw').$type<Record<string, unknown>>(),
    rawHash: text('raw_hash').notNull(),

    status: listingStatusEnum('status').notNull().default('active'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('listings_source_listing_uq').on(t.sourceId, t.sourceListingId),
    index('listings_location_gix').using('gist', t.location),
    index('listings_rent_idx').on(t.rent),
    index('listings_bedrooms_idx').on(t.bedrooms),
    index('listings_status_last_seen_idx').on(t.status, t.lastSeenAt),
    index('listings_amenities_gin').using('gin', t.amenities),
    index('listings_property_idx').on(t.propertyId),
    index('listings_society_trgm_idx').using('gin', sql`${t.societyName} gin_trgm_ops`),
  ],
);

/** Field-level history; written only for rent / deposit / status / available_from. */
export const listingChanges = pgTable(
  'listing_changes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
    field: text('field').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
  },
  (t) => [index('listing_changes_listing_idx').on(t.listingId, t.observedAt)],
);

export const scrapeRuns = pgTable(
  'scrape_runs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sourceId: smallint('source_id')
      .notNull()
      .references(() => sources.id),
    searchAreaId: integer('search_area_id').references(() => searchAreas.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: runStatusEnum('status').notNull().default('running'),
    pagesFetched: integer('pages_fetched').notNull().default(0),
    listingsSeen: integer('listings_seen').notNull().default(0),
    inserted: integer('inserted').notNull().default(0),
    updated: integer('updated').notNull().default(0),
    unchanged: integer('unchanged').notNull().default(0),
    parseFailures: integer('parse_failures').notNull().default(0),
    httpErrors: integer('http_errors').notNull().default(0),
    errorSample: jsonb('error_sample').$type<unknown[]>().notNull().default([]),
    notes: text('notes'),
  },
  (t) => [index('scrape_runs_source_started_idx').on(t.sourceId, t.startedAt)],
);
