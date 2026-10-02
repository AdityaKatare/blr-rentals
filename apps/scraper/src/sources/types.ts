import type { NormalizedListingInput, SourceSlug } from '@blr/core';
import type { ResolvedSearchArea } from '@blr/db';
import type { PlaceNames } from './shared/society';

export type SearchArea = ResolvedSearchArea;

export type RawListing = Record<string, unknown>;

export interface ParsedPage {
  raw: RawListing[];
  hasNext: boolean;
  total?: number;
  skipped?: number;
  pageSize?: number;
}

export interface NormalizeContext {
  area: SearchArea;
  pageUrl: string;
  fetchedAt: Date;
  places: PlaceNames;
}

export interface SourceAdapter {
  readonly slug: SourceSlug;
  readonly transport: 'http' | 'browser';
  readonly supports: { maxPages: number };
  readonly slices: readonly string[];
  buildSearchUrl(area: SearchArea, page: number, slice: string): string;
  parseSearchPage(body: string, url: string): ParsedPage;
  normalize(raw: RawListing, ctx: NormalizeContext): NormalizedListingInput;
}
