import type { SortOption } from '@blr/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { SourceBadges } from '@/components/listing/source-badges';
import { ResultsMap } from '@/components/map/results-map';
import { ActiveListingProvider } from '@/components/search/active-listing';
import { Pagination } from '@/components/search/pagination';
import { NearestMetroLabel } from '@/components/society/nearest-metro';
import { SocietyRentTable } from '@/components/society/society-rent-table';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import { loadSociety, societyName } from '@/server/societies';
import { readShortlistIds } from '@/server/shortlist';
import { rupees, timeAgo } from '@/utils/format';
import { formatCoord, pinsFromHits } from '@/utils/map';
import { first, withParams, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

const SOCIETY_SORTS: SortOption[] = ['rent_asc', 'movein_asc', 'newest'];
const SOCIETY_MAP_RADIUS_KM = 1;

interface SocietyPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Params>;
}

export async function generateMetadata({ params }: SocietyPageProps) {
  const { slug } = await params;
  const name = await societyName(slug);
  return { title: name ?? 'Apartment' };
}

export default async function SocietyPage({ params, searchParams }: SocietyPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const sort = SOCIETY_SORTS.find((s) => s === first(query.sort)) ?? 'rent_asc';
  const page = Math.max(1, Math.trunc(Number(first(query.page) ?? 1)) || 1);

  const [outcome, savedIds] = await Promise.all([loadSociety(slug, { page, sort }), readShortlistIds()]);
  if (outcome.kind === 'db-error') {
    return (
      <PageShell width="reading">
        <DatabaseErrorNotice message={outcome.message} />
      </PageShell>
    );
  }
  if (outcome.kind === 'not-found') notFound();

  const { society, hits, total, pages, tookMs } = outcome.page;
  const saved = new Set(savedIds);
  const range = society.rentMin === society.rentMax ? rupees(society.rentMin) : `${rupees(society.rentMin)} - ${rupees(society.rentMax)}`;
  const updated = timeAgo(society.lastUpdatedAt);
  const { pins, approxOnly } = pinsFromHits(hits);
  const basePath = `/societies/${society.slug}`;
  const nearbyHref = society.center
    ? `/?lat=${formatCoord(society.center.lat)}&lng=${formatCoord(society.center.lng)}&radiusKm=${SOCIETY_MAP_RADIUS_KM}`
    : null;

  return (
    <ActiveListingProvider>
      <PageShell>
        <nav className="label mb-3">
          <Link href="/societies" className="underline underline-offset-4 hover:text-warn">
            Apartments
          </Link>
          <span aria-hidden> / </span>
          <span className="text-ink">{society.name}</span>
        </nav>

        <PageHeadline
          title={society.name}
          aside={
            <Link href="/" className="label underline underline-offset-4 hover:text-warn">
              Back to search
            </Link>
          }
        >
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-second">
            <span>
              {total} live {total === 1 ? 'unit' : 'units'} &middot; {range}
              {society.localities.length > 0 && ` · ${society.localities.join(', ')}`}
              {updated && ` · last seen ${updated}`}
            </span>
            <span>
              {society.nearestMetro ? <NearestMetroLabel metro={society.nearestMetro} /> : 'No open metro station within 3 km'}
            </span>
            <SourceBadges sources={society.sources} />
          </div>
        </PageHeadline>

        <div className="grid gap-6 py-6 lg:grid-cols-2">
          <SocietyRentTable stats={society.byBedrooms} />
          {society.center && (
            <div className="h-72 border border-ink lg:h-full lg:min-h-72">
              <ResultsMap
                center={society.center}
                radiusKm={SOCIETY_MAP_RADIUS_KM}
                pins={pins}
                approxOnly={approxOnly}
                page={outcome.page.page}
                pages={pages}
                total={total}
                near={society.name}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Sort</span>
            {SOCIETY_SORTS.map((s) => (
              <Link
                key={s}
                href={withParams(query, { sort: s, page: null }, basePath)}
                scroll={false}
                aria-current={s === sort ? 'true' : undefined}
                className={`border px-2.5 py-1 text-[12px] ${
                  s === sort ? 'border-ink bg-ink text-paper' : 'border-rule bg-sheet hover:border-ink'
                }`}
              >
                {SORT_LABELS[s]}
              </Link>
            ))}
          </div>
          <p className="label tabular">{tookMs} ms</p>
        </div>

        <div className="@container">
          {hits.map((hit) => (
            <ListingRow key={hit.id} hit={hit} saved={saved.has(hit.id)} />
          ))}
        </div>

        {nearbyHref && (
          <p className="py-4 text-[13px]">
            <Link href={nearbyHref} className="underline underline-offset-4 hover:text-warn">
              Search every rental within {SOCIETY_MAP_RADIUS_KM} km of here
            </Link>
          </p>
        )}

        <Pagination params={query} page={outcome.page.page} pages={pages} basePath={basePath} />
      </PageShell>
    </ActiveListingProvider>
  );
}
