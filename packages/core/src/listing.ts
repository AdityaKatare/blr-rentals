import { z } from 'zod';
import {
  AMENITIES,
  FURNISHINGS,
  GEO_ACCURACIES,
  LISTED_BY,
  PARKINGS,
  PROPERTY_TYPES,
  SOURCE_SLUGS,
  TENANT_PREFERENCES,
} from './enums';

export const ImageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  isCover: z.boolean().optional(),
});
export type Image = z.infer<typeof ImageSchema>;

const optInt = (min = 0) => z.number().int().min(min).nullable().default(null);

export const NormalizedListingSchema = z
  .object({
    source: z.enum(SOURCE_SLUGS),
    sourceListingId: z.string().min(1),
    sourceUrl: z.string().url(),

    title: z.string().min(1).max(300),
    description: z.string().max(2000).nullable().default(null),
    propertyType: z.enum(PROPERTY_TYPES),
    bedrooms: z.number().int().min(0).max(20),
    is1rk: z.boolean().default(false),
    bedroomsPlus: z.boolean().default(false),
    bathrooms: optInt(),
    balconies: optInt(),

    rent: z.number().int().positive(),
    deposit: optInt(),
    maintenance: optInt(),
    maintenanceIncluded: z.boolean().nullable().default(null),

    areaSqft: z.number().int().positive().nullable().default(null),
    carpetAreaSqft: z.number().int().positive().nullable().default(null),
    floor: z.number().int().min(-5).nullable().default(null),
    totalFloors: optInt(),

    furnishing: z.enum(FURNISHINGS).default('unknown'),
    parking: z.enum(PARKINGS).default('unknown'),
    tenantPreference: z.enum(TENANT_PREFERENCES).default('unknown'),
    listedBy: z.enum(LISTED_BY).default('unknown'),

    locality: z.string().nullable().default(null),
    subLocality: z.string().nullable().default(null),
    city: z.string().default('Bengaluru'),
    pincode: z.string().regex(/^\d{6}$/).nullable().default(null),
    societyName: z.string().nullable().default(null),

    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    geoAccuracy: z.enum(GEO_ACCURACIES).default('none'),

    amenities: z.array(z.enum(AMENITIES)).default([]),
    images: z.array(ImageSchema).default([]),
    isVerified: z.boolean().default(false),
    isSponsored: z.boolean().default(false),

    availableFrom: z.string().date().nullable().default(null),
    postedAt: z.string().datetime({ offset: true }).nullable().default(null),
    sourceUpdatedAt: z.string().datetime({ offset: true }).nullable().default(null),

    raw: z.record(z.unknown()).default({}),
  })
  .superRefine((v, ctx) => {
    if ((v.lat === null) !== (v.lng === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lat and lng must both be set or both be null',
        path: ['lat'],
      });
    }
    if (v.lat !== null && v.geoAccuracy === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'geoAccuracy must not be "none" when coordinates are present',
        path: ['geoAccuracy'],
      });
    }
    if (v.lat === null && v.geoAccuracy !== 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'geoAccuracy must be "none" without coordinates',
        path: ['geoAccuracy'],
      });
    }
  });

export type NormalizedListing = z.infer<typeof NormalizedListingSchema>;
export type NormalizedListingInput = z.input<typeof NormalizedListingSchema>;
