import Link from 'next/link';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { ListingRow } from '@/components/listing/listing-row';
import { ActiveListingProvider } from '@/components/search/active-listing';
import { EmptyShortlist } from '@/components/shortlist/empty-shortlist';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { loadShortlist, readShortlistIds } from '@/server/shortlist';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shortlist' };

export default async function ShortlistPage() {
  const shortlist = await loadShortlist(await readShortlistIds());
  const counts =
    'error' in shortlist
      ? null
      : `${shortlist.active.length} saved ${shortlist.active.length === 1 ? 'listing' : 'listings'}${
          shortlist.gone.length > 0 ? `, ${shortlist.gone.length} no longer listed` : ''
        }. Saved in this browser only.`;

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
      ) : shortlist.active.length + shortlist.gone.length === 0 ? (
        <div className="py-6">
          <EmptyShortlist />
        </div>
      ) : (
        <ActiveListingProvider>
          <div className="@container">
            {[...shortlist.active, ...shortlist.gone].map((hit) => (
              <ListingRow key={hit.id} hit={hit} saved />
            ))}
          </div>
        </ActiveListingProvider>
      )}
    </PageShell>
  );
}
