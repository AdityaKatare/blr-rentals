import type { SortOption } from '@blr/core';
import Link from 'next/link';
import { GUTTER, PAGE_WIDTH } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { MapDialog } from '@/components/map/map-dialog';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import { DEPOSIT_FILTER_NOTE, METRO_FILTER_NOTE } from '@/constants/search';
import type { SearchOutcome } from '@/server/search';
import { clearFiltersHref, type ActiveFilter } from '@/utils/filters';
import { centerLabel, pinsFromHits } from '@/utils/map';
import { first, isDepositMonths, isNearMetroOption, withParams, type Params } from '@/utils/search-params';
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
  if (outcome.kind === 'no-center') {
    return (
      <div className={`${PAGE_WIDTH} ${GUTTER} flex flex-col gap-5 py-6`}>
        <Notice tone="plain" title="Where are you looking?">
          Name an area on the line above, or drop a point with “Pick on map”. Nothing is searched
          until you do.
        </Notice>
        <div className="flex flex-col gap-2">
          <p className="label">Areas with listings</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {outcome.localities.map((l) => (
              <Link
                key={l.name}
                href={withParams(params, { locality: l.name, lat: null, lng: null, page: null })}
                className="text-[13px] underline decoration-hair underline-offset-4 hover:decoration-ink"
              >
                {l.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          <div className="ml-auto flex items-center gap-4">
            <MapDialog
              map={{
                center: { lat: result.center.lat, lng: result.center.lng },
                radiusKm,
                pins,
                approxOnly,
                page: result.page,
                pages: result.pages,
                total: result.total,
                near,
              }}
            />
            <p className="label tabular">
              {SORT_LABELS[sort]} · {result.tookMs} ms
            </p>
          </div>
        </div>
        {notes.map((note) => (
          <p key={note} className="max-w-3xl text-[12px] leading-snug text-muted">
            {note}
          </p>
        ))}
      </div>

      <div className={`${PAGE_WIDTH} ${GUTTER} @container pb-10`}>
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
    </ActiveListingProvider>
  );
}
