import { z } from 'zod';
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES, SORT_OPTIONS, SOURCE_SLUGS } from './enums';

export const DEFAULT_RADIUS_KM = 5;

export const SearchQuerySchema = z.object({
  center: z.union([
    z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    z.object({ localityId: z.number().int().positive() }),
  ]),
  radiusKm: z.number().min(0.5).max(25).default(DEFAULT_RADIUS_KM),
  rent: z
    .object({
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().positive().optional(),
    })
    .default({}),
  bedrooms: z.array(z.number().int().min(0).max(10)).default([]),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)).optional(),
  furnishing: z.array(z.enum(FURNISHINGS)).optional(),
  amenitiesAll: z.array(z.enum(AMENITIES)).optional(),
  parking: z.enum(['any', 'required']).default('any'),
  listedBy: z.enum(['any', 'owner']).default('any'),
  availableBy: z.string().date().optional(),
  // keep in sync with NEAR_METRO_OPTIONS_M
  nearMetroM: z.union([z.literal(500), z.literal(1000), z.literal(1500)]).optional(),
  sources: z.array(z.enum(SOURCE_SLUGS)).optional(),
  sort: z.enum(SORT_OPTIONS).default('relevance'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchQueryInput = z.input<typeof SearchQuerySchema>;
