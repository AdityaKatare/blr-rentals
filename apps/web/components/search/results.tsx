import type { SortOption } from '@blr/core';
import Link from 'next/link';
import { GUTTER, PAGE_WIDTH } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { MapPanel } from '@/components/map/map-panel';
import { ResultsMap } from '@/components/map/results-map';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import { DEPOSIT_FILTER_NOTE, METRO_FILTER_NOTE } from '@/constants/search';
import type { SearchOutcome } from '@/server/search';
import { clearFiltersHref, type ActiveFilter } from '@/utils/filters';
import { centerLabel, pinsFromHits } from '@/utils/map';
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

const MAP_NOTE = 'Hovering a row lifts its pin. Clicking a pin scrolls to the row. Ctrl or Cmd with the wheel, or pinch, to zoom.';

export function Results({ outcome, params, sort, radiusKm, saved, chips }: ResultsProps) {
  if (outcome.kind !== 'ok') {
    return (
      <div className={`${PAGE_WIDTH} ${GUTTER} py-6`}>
        {outcome.kind === 'db-error' ? (
          <DatabaseErrorNotice message={outcome.message} />
        ) : outcome.kind === 'unknown-locality' ? (
          <Notice tone="alert" title={`No locality matches “${outcome.text}”`}>
            Try a nearby area, for example {outcome.localities.slice(0, 6).map((l) => l.name).join(', ')}.
          </Notice>
        ) : (
          <Notice tone="alert" title="Some filters are out of range">
            <ul className="list-disc pl-5">
              {outcome.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>
    );
  }

  const { result } = outcome;
  const near = centerLabel(result.center);
  const { pins, approxOnly } = pinsFromHits(result.hits);
  const notes: string[] = [];
  if (isNearMetroOption(Number(first(params.nearMetro)))) notes.push(METRO_FILTER_NOTE);
  if (isDepositMonths(Number(first(params.depositMonths)))) notes.push(DEPOSIT_FILTER_NOTE);

  return (
    <ActiveListingProvider>
      <div className={`${PAGE_WIDTH} ${GUTTER} flex flex-col gap-2 border-b border-hair py-2.5`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ActiveFilterChips chips={chips} clearAllHref={clearFiltersHref(params)} />
          <p className="label tabular ml-auto">
            {SORT_LABELS[sort]} · {result.tookMs} ms
          </p>
        </div>
        {notes.map((note) => (
          <p key={note} className="max-w-3xl text-[12px] leading-snug text-muted">
            {note}
          </p>
        ))}
      </div>

      <div className={`${PAGE_WIDTH} grid px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8 lg:pr-0 lg:pl-10 xl:grid-cols-[minmax(0,1fr)_400px]`}>
        <MapPanel note={MAP_NOTE}>
          <ResultsMap
            center={{ lat: result.center.lat, lng: result.center.lng }}
            radiusKm={radiusKm}
            pins={pins}
            approxOnly={approxOnly}
            page={result.page}
            pages={result.pages}
            total={result.total}
            near={near}
          />
        </MapPanel>

        <div className="@container order-2 min-w-0 pb-10 lg:order-1">
          {result.hits.length === 0 ? (
            <div className="py-6">
              <Notice tone="alert" title="Nothing matches these filters yet">
                Widen the radius, raise the rent limit or clear some filters. Only areas the scraper has visited have
                listings. To look inside one apartment wherever it is, search it under{' '}
                <Link href="/societies" className="underline underline-offset-4">
                  Apartments
                </Link>
                .
              </Notice>
            </div>
          ) : (
            result.hits.map((hit) => <ListingRow key={hit.id} hit={hit} saved={saved.has(hit.id)} />)
          )}

          <Pagination params={params} page={result.page} pages={result.pages} />
        </div>
      </div>
    </ActiveListingProvider>
  );
}
