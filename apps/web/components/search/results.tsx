import type { SortOption } from '@blr/core';
import Link from 'next/link';
import { ListingCard } from '@/components/listing/listing-card';
import { ResultsMap } from '@/components/map/results-map';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import type { SearchOutcome } from '@/server/search';
import { clearFiltersHref, type ActiveFilter } from '@/utils/filters';
import { pinsFromHits } from '@/utils/map';
import { first, isDepositMonths, isNearMetroOption, type Params } from '@/utils/search-params';
import { ActiveFilterChips } from './active-filter-chips';
import { ActiveListingProvider } from './active-listing';
import { Pagination } from './pagination';

interface ResultsProps {
  outcome: SearchOutcome;
  params: Params;
  sort: SortOption;
  radiusKm: number;
  saved: ReadonlySet<string>;
  chips: ActiveFilter[];
}

export function Results({ outcome, params, sort, radiusKm, saved, chips }: ResultsProps) {
  if (outcome.kind === 'db-error') {
    return <DatabaseErrorNotice message={outcome.message} />;
  }
  if (outcome.kind === 'unknown-locality') {
    return (
      <Notice tone="amber" title={`No locality matches “${outcome.text}”`}>
        Try a nearby area, e.g. {outcome.localities.slice(0, 6).map((l) => l.name).join(', ')}.
      </Notice>
    );
  }
  if (outcome.kind === 'invalid') {
    return (
      <Notice tone="amber" title="Some filters are out of range">
        <ul className="list-disc pl-5">
          {outcome.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Notice>
    );
  }

  const { result } = outcome;
  const { lat, lng, locality, nearest } = result.center;
  const near = locality?.name ?? (nearest ? `your map pin near ${nearest.name}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  const { pins, approxOnly } = pinsFromHits(result.hits);
  const notes: string[] = [];
  if (isNearMetroOption(Number(first(params.nearMetro)))) {
    notes.push(
      'Metro distance is measured in a straight line from open Namma Metro stations. Listings placed only at their locality centre cannot match this filter and are left out.',
    );
  }
  if (isDepositMonths(Number(first(params.depositMonths)))) {
    notes.push(
      'Deposit in months is the published deposit divided by the rent. Listings with no deposit, or one too far off the rent to believe, are left out.',
    );
  }

  return (
    <ActiveListingProvider>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">
          {result.total.toLocaleString('en-IN')} {result.total === 1 ? 'rental' : 'rentals'} within {radiusKm} km of {near}
        </h1>
        <p className="text-xs text-zinc-500">
          {SORT_LABELS[sort]} · {result.tookMs} ms
        </p>
      </div>

      {notes.length > 0 && (
        <div className="space-y-1 text-xs text-zinc-500">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}

      <ActiveFilterChips chips={chips} clearAllHref={clearFiltersHref(params)} />

      <ResultsMap
        center={{ lat, lng }}
        radiusKm={radiusKm}
        pins={pins}
        approxOnly={approxOnly}
        page={result.page}
        pages={result.pages}
        total={result.total}
        near={near}
      />

      {result.hits.length === 0 ? (
        <Notice tone="zinc" title="Nothing matches these filters yet">
          Widen the radius, raise the rent limit or clear some filters. Only areas the scraper has visited have
          listings. To look inside one apartment wherever it is, search it under{' '}
          <Link href="/societies" className="underline underline-offset-2">
            Apartments
          </Link>
          .
        </Notice>
      ) : (
        <div className="space-y-3">
          {result.hits.map((hit) => (
            <ListingCard key={hit.id} hit={hit} saved={saved.has(hit.id)} />
          ))}
        </div>
      )}

      <Pagination params={params} page={result.page} pages={result.pages} />
    </ActiveListingProvider>
  );
}
