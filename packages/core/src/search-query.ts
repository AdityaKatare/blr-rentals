import { z } from 'zod';
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES, SOURCE_SLUGS } from './enums';

/**
 * The single search contract. The filter form, a shareable URL and (Phase 2) a
 * natural-language parser all produce this object; the API only accepts this.
 */
export const SearchQuerySchema = z.object({
  center: z.union([
    z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    z.object({ localityId: z.number().int().positive() }),
  ]),
  radiusKm: z.number().min(0.5).max(25).default(5),
  rent: z
    .object({
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().positive().optional(),
    })
    .default({}),
  /** 0 = 1RK/studio. Empty = any. */
  bedrooms: z.array(z.number().int().min(0).max(10)).default([]),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)).optional(),
  furnishing: z.array(z.enum(FURNISHINGS)).optional(),
  amenitiesAll: z.array(z.enum(AMENITIES)).optional(),
  parking: z.enum(['any', 'required']).default('any'),
  listedBy: z.enum(['any', 'owner']).default('any'),
  availableBy: z.string().date().optional(),
  sources: z.array(z.enum(SOURCE_SLUGS)).optional(),
  sort: z.enum(['relevance', 'rent_asc', 'distance', 'newest']).default('relevance'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchQueryInput = z.input<typeof SearchQuerySchema>;
