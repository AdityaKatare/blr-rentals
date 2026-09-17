import type { SortOption } from '@blr/core';
import { ListingCard } from '@/components/listing/listing-card';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import type { SearchOutcome } from '@/server/search';
import { clearFiltersHref, type ActiveFilter } from '@/utils/filters';
import type { Params } from '@/utils/search-params';
import { ActiveFilterChips } from './active-filter-chips';
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
  const near = result.center.locality?.name ?? `${result.center.lat.toFixed(4)}, ${result.center.lng.toFixed(4)}`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">
          {result.total.toLocaleString('en-IN')} {result.total === 1 ? 'rental' : 'rentals'} within {radiusKm} km of {near}
        </h1>
        <p className="text-xs text-zinc-500">
          {SORT_LABELS[sort]} · {result.tookMs} ms
        </p>
      </div>

      <ActiveFilterChips chips={chips} clearAllHref={clearFiltersHref(params)} />

      {result.hits.length === 0 ? (
        <Notice tone="zinc" title="Nothing matches these filters yet">
          Widen the radius, raise the rent limit or clear some filters. Only areas the scraper has visited have listings.
        </Notice>
      ) : (
        <div className="space-y-3">
          {result.hits.map((hit) => (
            <ListingCard key={hit.id} hit={hit} saved={saved.has(hit.id)} />
          ))}
        </div>
      )}

      <Pagination params={params} page={result.page} pages={result.pages} />
    </>
  );
}
