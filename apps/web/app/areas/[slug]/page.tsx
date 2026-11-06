import { AREA_MIN_LISTINGS, type SortOption } from '@blr/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { ResultsMap } from '@/components/map/results-map';
import { ActiveListingProvider } from '@/components/search/active-listing';
import { Pagination } from '@/components/search/pagination';
import { NearestMetroLabel } from '@/components/society/nearest-metro';
import { SocietyRentTable } from '@/components/society/society-rent-table';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { SORT_LABELS } from '@/constants/labels';
import { loadArea } from '@/server/areas';
import { readShortlistIds } from '@/server/shortlist';
import { areaDescription, areaRentSummary } from '@/utils/areas';
import { formatDistance } from '@/utils/format';
import { pinsFromHits } from '@/utils/map';
import { first, withParams, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

const AREA_SORTS: SortOption[] = ['rent_asc', 'movein_asc', 'newest'];
const AREA_MAP_RADIUS_KM = 5;

interface AreaPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Params>;
}

const readView = (query: Params) => ({
  sort: AREA_SORTS.find((s) => s === first(query.sort)) ?? 'rent_asc',
  page: Math.max(1, Math.trunc(Number(first(query.page) ?? 1)) || 1),
});

export async function generateMetadata({ params, searchParams }: AreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const { sort, page } = readView(query);
  const outcome = await loadArea(slug, page, sort);
  if (outcome.kind !== 'ok') return { title: 'Area' };
  const { area, total, byBedrooms } = outcome.page;
  const indexable = Object.keys(query).length === 0 && total >= AREA_MIN_LISTINGS;
  return {
    title: `Flats & Apartments for Rent in ${area.name}, Bangalore`,
    description: areaDescription(area.name, total, byBedrooms),
    ...(indexable ? { alternates: { canonical: `/areas/${area.slug}` } } : { robots: { index: false, follow: true } }),
  };
}

function AreaSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule py-5">
      <h2 className="font-display text-[22px] leading-none">{title}</h2>
      <div className="mt-3 text-[14px]">{children}</div>
    </section>
  );
}

export default async function AreaPage({ params, searchParams }: AreaPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const { sort, page } = readView(query);

  const [outcome, savedIds] = await Promise.all([loadArea(slug, page, sort), readShortlistIds()]);
  if (outcome.kind === 'db-error') {
    return (
      <PageShell width="reading">
        <DatabaseErrorNotice message={outcome.message} />
      </PageShell>
    );
  }
  if (outcome.kind === 'not-found') notFound();

  const { area, byBedrooms, metro, techParks, societies, hits, total, pages, tookMs } = outcome.page;
  const saved = new Set(savedIds);
  const { pins, approxOnly } = pinsFromHits(hits);
  const basePath = `/areas/${area.slug}`;
  const searchHref = withParams({}, { locality: area.name });
  const summary = areaRentSummary(byBedrooms);
  const center = { lat: area.lat, lng: area.lng };

  return (
    <ActiveListingProvider>
      <PageShell>
        <nav className="label mb-3">
          <Link href="/" className="underline underline-offset-4 hover:text-warn">
            Bangalore
          </Link>
          <span aria-hidden> / </span>
          <span className="text-ink">{area.name}</span>
        </nav>

        <PageHeadline
          title={`Flats and apartments for rent in ${area.name}`}
          aside={
            <Link href={searchHref} className="label underline underline-offset-4 hover:text-warn">
              Refine this search
            </Link>
          }
        >
          <p className="mt-2 text-[13px] text-second">
            {total.toLocaleString('en-IN')} {total === 1 ? 'home' : 'homes'} in {area.name} from the rental portals, in one list.
            {summary && ` ${summary}`}
          </p>
        </PageHeadline>

        {total === 0 ? (
          <div className="py-6">
            <Notice tone="plain" title={`No listings in ${area.name} right now`}>
              <Link href={searchHref} className="underline underline-offset-4">
                Search around {area.name}
              </Link>{' '}
              to include the areas next to it.
            </Notice>
          </div>
        ) : (
          <>
            <div className="grid gap-6 py-6 lg:grid-cols-2">
              <SocietyRentTable stats={byBedrooms} unitsLabel="Homes" lowLabel="Typical low" highLabel="Typical high" />
              <div className="h-72 border border-ink lg:h-full lg:min-h-72">
                <ResultsMap
                  center={center}
                  radiusKm={AREA_MAP_RADIUS_KM}
                  pins={pins}
                  approxOnly={approxOnly}
                  page={outcome.page.page}
                  pages={pages}
                  total={total}
                  near={area.name}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label">Sort</span>
                {AREA_SORTS.map((s) => (
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

            <Pagination params={query} page={outcome.page.page} pages={pages} basePath={basePath} />
          </>
        )}

        {(metro.length > 0 || techParks.length > 0) && (
          <AreaSection title={`Near ${area.name}`}>
            <ul className="flex flex-col gap-1.5">
              {metro.map((station) => (
                <li key={station.name}>
                  <NearestMetroLabel metro={station} />
                </li>
              ))}
              {techParks.map((park) => (
                <li key={park.name}>
                  {formatDistance(park.distanceM)} to {park.name}
                </li>
              ))}
            </ul>
          </AreaSection>
        )}

        {societies.length > 0 && (
          <AreaSection title={`Apartments in ${area.name}`}>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {societies.map((society) => (
                <li key={society.slug}>
                  <Link href={`/societies/${society.slug}`} className="underline underline-offset-4 hover:text-warn">
                    {society.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AreaSection>
        )}

        {outcome.neighbours.length > 0 && (
          <AreaSection title={`Areas near ${area.name}`}>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {outcome.neighbours.map((neighbour) => (
                <li key={neighbour.slug}>
                  <Link href={`/areas/${neighbour.slug}`} className="underline underline-offset-4 hover:text-warn">
                    Flats for rent in {neighbour.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AreaSection>
        )}
      </PageShell>
    </ActiveListingProvider>
  );
}
