import Link from 'next/link';
import { ListingCard } from '@/components/listing/listing-card';
import { EmptyShortlist } from '@/components/shortlist/empty-shortlist';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { loadShortlist, readShortlistIds } from '@/server/shortlist';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shortlist · blr-rentals' };

export default async function ShortlistPage() {
  const shortlist = await loadShortlist(await readShortlistIds());

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Shortlist</h1>
        <Link href="/" className="text-sm text-zinc-600 underline underline-offset-2">
          Back to search
        </Link>
      </div>

      {'error' in shortlist ? (
        <DatabaseErrorNotice message={shortlist.error} />
      ) : shortlist.active.length + shortlist.gone.length === 0 ? (
        <EmptyShortlist />
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            {shortlist.active.length} saved {shortlist.active.length === 1 ? 'listing' : 'listings'}
            {shortlist.gone.length > 0 && `, ${shortlist.gone.length} no longer listed`}. Saved in this browser only.
          </p>
          <div className="space-y-3">
            {[...shortlist.active, ...shortlist.gone].map((hit) => (
              <ListingCard key={hit.id} hit={hit} saved />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
