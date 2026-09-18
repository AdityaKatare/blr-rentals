import type { SortOption } from '@blr/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listing/listing-card';
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
  return { title: name ? `${name} · blr-rentals` : 'Apartment · blr-rentals' };
}

export default async function SocietyPage({ params, searchParams }: SocietyPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const sort = SOCIETY_SORTS.find((s) => s === first(query.sort)) ?? 'rent_asc';
  const page = Math.max(1, Math.trunc(Number(first(query.page) ?? 1)) || 1);

  const [outcome, savedIds] = await Promise.all([loadSociety(slug, { page, sort }), readShortlistIds()]);
  if (outcome.kind === 'db-error') {
    return (
      <div className="mx-auto max-w-3xl">
        <DatabaseErrorNotice message={outcome.message} />
      </div>
    );
  }
  if (outcome.kind === 'not-found') notFound();

  const { society, hits, total, pages, tookMs } = outcome.page;
  const saved = new Set(savedIds);
  const range = society.rentMin === society.rentMax ? rupees(society.rentMin) : `${rupees(society.rentMin)} – ${rupees(society.rentMax)}`;
  const updated = timeAgo(society.lastUpdatedAt);
  const { pins, approxOnly } = pinsFromHits(hits);
  const basePath = `/societies/${society.slug}`;
  const nearbyHref = society.center
    ? `/?lat=${formatCoord(society.center.lat)}&lng=${formatCoord(society.center.lng)}&radiusKm=${SOCIETY_MAP_RADIUS_KM}`
    : null;

  return (
    <ActiveListingProvider>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <nav className="text-sm text-zinc-600">
            <Link href="/societies" className="underline underline-offset-2">
              Apartments
            </Link>
            <span aria-hidden> / </span>
            <span className="text-zinc-900">{society.name}</span>
          </nav>
          <Link href="/" className="text-sm text-zinc-600 underline underline-offset-2">
            Back to search
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{society.name}</h1>
            <p className="text-sm text-zinc-600">
              {total} live {total === 1 ? 'unit' : 'units'} · {range}
              {society.localities.length > 0 && ` · ${society.localities.join(', ')}`}
              {updated && ` · last seen ${updated}`}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {society.nearestMetro ? (
                <NearestMetroLabel metro={society.nearestMetro} />
              ) : (
                'No open metro station within 3 km'
              )}
            </p>
          </div>
          <SourceBadges sources={society.sources} />
        </div>

        <SocietyRentTable stats={society.byBedrooms} />

        {society.center && (
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
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {SOCIETY_SORTS.map((s) => (
              <Link
                key={s}
                href={withParams(query, { sort: s, page: null }, basePath)}
                scroll={false}
                aria-current={s === sort ? 'true' : undefined}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  s === sort ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white hover:border-zinc-500'
                }`}
              >
                {SORT_LABELS[s]}
              </Link>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{tookMs} ms</p>
        </div>

        <div className="space-y-3">
          {hits.map((hit) => (
            <ListingCard key={hit.id} hit={hit} saved={saved.has(hit.id)} />
          ))}
        </div>

        {nearbyHref && (
          <p className="text-sm text-zinc-600">
            <Link href={nearbyHref} className="underline underline-offset-2">
              Search every rental within {SOCIETY_MAP_RADIUS_KM} km of here
            </Link>
          </p>
        )}

        <Pagination params={query} page={outcome.page.page} pages={pages} basePath={basePath} />
      </div>
    </ActiveListingProvider>
  );
}
