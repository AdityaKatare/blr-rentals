import type { NormalizedListing, SourceSlug } from '@blr/core';
import type { ResolvedSearchArea } from '@blr/db';

export type SearchArea = ResolvedSearchArea;

/** One listing exactly as the source serialises it (already PII-stripped by the adapter). */
export type RawListing = Record<string, unknown>;

export interface ParsedPage {
  raw: RawListing[];
  hasNext: boolean;
  total?: number;
  pageSize?: number;
}

export interface NormalizeContext {
  area: SearchArea;
  pageUrl: string;
  fetchedAt: Date;
}

/**
 * The contract every source implements. `pipeline/run.ts` knows nothing else
 * about a source. Adding a site = one folder implementing this + one line in
 * registry.ts + captured fixtures.
 */
export interface SourceAdapter {
  readonly slug: SourceSlug;
  readonly transport: 'http' | 'browser';
  readonly supports: { radiusSearch: boolean; maxPages: number };
  /** Must be a robots-allowed URL; the pipeline verifies anyway. */
  buildSearchUrl(area: SearchArea, page: number): string;
  parseSearchPage(body: string, url: string): ParsedPage;
  /** Must call stripPii() and return an object NormalizedListingSchema accepts. */
  normalize(raw: RawListing, ctx: NormalizeContext): NormalizedListing;
  /** Optional detail enrichment. Unused in MVP. */
  fetchDetail?(raw: RawListing): Promise<RawListing>;
}
