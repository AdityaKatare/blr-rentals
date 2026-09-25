import Link from 'next/link';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { ActiveFilterChips } from '@/components/search/active-filter-chips';
import { ActiveListingProvider } from '@/components/search/active-listing';
import { EmptyShortlist } from '@/components/shortlist/empty-shortlist';
import { ShortlistInsights } from '@/components/shortlist/shortlist-insights';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { loadShortlist, readShortlistIds } from '@/server/shortlist';
import { sizeLabel } from '@/utils/format';
import { first, type Params } from '@/utils/search-params';
import { parseShortlistSize, shortlistSizeHref } from '@/utils/shortlist';
import { summarizeShortlist } from '@/utils/shortlist-insights';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shortlist' };

interface ShortlistPageProps {
  searchParams: Promise<Params>;
}

export default async function ShortlistPage({ searchParams }: ShortlistPageProps) {
  const [shortlist, params] = await Promise.all([loadShortlist(await readShortlistIds()), searchParams]);
  const size = parseShortlistSize(first(params.bedrooms));
  const saved = 'error' in shortlist ? 0 : shortlist.active.length + shortlist.gone.length;
  const counts =
    'error' in shortlist || saved === 0
      ? null
      : `${shortlist.active.length} saved ${shortlist.active.length === 1 ? 'listing' : 'listings'}${
          shortlist.gone.length > 0 ? `, ${shortlist.gone.length} no longer listed` : ''
        }. Saved in this browser only.`;
  const insights = 'error' in shortlist ? null : summarizeShortlist(shortlist.active);
  const all = 'error' in shortlist ? [] : [...shortlist.active, ...shortlist.gone];
  const rows = size === null ? all : all.filter((hit) => hit.bedrooms === size);

  return (
    <PageShell>
      <PageHeadline
        title="Shortlist"
        aside={
          <Link href="/" className="label underline underline-offset-4 hover:text-warn">
            Back to search
          </Link>
        }
      >
        {counts && <p className="mt-2 text-[13px] text-second">{counts}</p>}
      </PageHeadline>

      {'error' in shortlist ? (
        <div className="py-6">
          <DatabaseErrorNotice message={shortlist.error} />
        </div>
      ) : saved === 0 ? (
        <div className="py-6">
          <EmptyShortlist />
        </div>
      ) : (
        <ActiveListingProvider>
          {insights && <ShortlistInsights insights={insights} activeSize={size} />}
          {size !== null && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink py-2.5">
              <ActiveFilterChips
                chips={[{ key: 'bedrooms', label: sizeLabel(size), href: shortlistSizeHref(null) }]}
                clearAllHref={shortlistSizeHref(null)}
              />
              <p className="label tabular">
                {rows.length} of {saved} saved
              </p>
            </div>
          )}
          {size !== null && rows.length === 0 ? (
            <p className="py-6 text-[13px] text-second">No saved {sizeLabel(size)} listings.</p>
          ) : (
            <div className="@container">
              {rows.map((hit) => (
                <ListingRow key={hit.id} hit={hit} saved />
              ))}
            </div>
          )}
        </ActiveListingProvider>
      )}
    </PageShell>
  );
}
