import { listingsByIds, type SearchHit } from '@blr/db';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { parseShortlist, SHORTLIST_COOKIE } from '@/lib/shortlist';
import { ListingCard } from '../listing-card';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shortlist · blr-rentals' };

export default async function ShortlistPage() {
  const ids = parseShortlist((await cookies()).get(SHORTLIST_COOKIE)?.value);

  let hits: SearchHit[] = [];
  let error: string | null = null;
  if (ids.length) {
    try {
      hits = await listingsByIds(getDb().sql, ids);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  const active = hits.filter((h) => h.status === 'active');
  const gone = hits.filter((h) => h.status !== 'active');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Shortlist</h1>
        <Link href="/" className="text-sm text-zinc-600 underline underline-offset-2">
          Back to search
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">
          <p className="font-medium">Database unreachable</p>
          <p className="mt-1 text-zinc-600">{error}</p>
        </div>
      ) : hits.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">Nothing saved yet</p>
          <p className="mt-1">Tap the heart on a listing to keep it here while you compare.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            {active.length} saved {active.length === 1 ? 'listing' : 'listings'}
            {gone.length > 0 && `, ${gone.length} no longer listed`}. Saved in this browser only.
          </p>
          <div className="space-y-3">
            {[...active, ...gone].map((hit) => (
              <ListingCard key={hit.id} hit={hit} saved />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
