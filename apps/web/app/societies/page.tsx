import Link from 'next/link';
import { SocietySummaryCard } from '@/components/society/society-summary-card';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { loadSocieties, loadSocietyNames } from '@/server/societies';
import { first, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Apartments · blr-rentals' };

export default async function SocietiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const [outcome, names] = await Promise.all([loadSocieties(q), loadSocietyNames()]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Apartments and societies</h1>
        <Link href="/" className="text-sm text-zinc-600 underline underline-offset-2">
          Back to search
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        Every unit in one apartment, wherever it is in the city. Rent search by area lives on the{' '}
        <Link href="/" className="underline underline-offset-2">
          search page
        </Link>
        .
      </p>

      <form method="get" action="/societies" className="flex gap-2">
        <input
          name="q"
          list="society-names"
          defaultValue={q ?? ''}
          placeholder="Prestige Shantiniketan, Raintree, Sobha…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          autoComplete="off"
          autoFocus
        />
        {names.length > 0 && (
          <datalist id="society-names">
            {names.map((n) => (
              <option key={n.slug} value={n.name} />
            ))}
          </datalist>
        )}
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          Search
        </button>
      </form>

      {outcome.kind === 'db-error' ? (
        <DatabaseErrorNotice message={outcome.message} />
      ) : outcome.societies.length === 0 ? (
        <Notice tone="zinc" title={q ? `No apartment matches “${q}”` : 'No apartments yet'}>
          Names come from the listings themselves, so only apartments the scraper has seen appear here. Try a shorter
          part of the name, such as the builder.
        </Notice>
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            {q
              ? `${outcome.total.toLocaleString('en-IN')} ${outcome.total === 1 ? 'apartment' : 'apartments'} match “${q}”`
              : `${outcome.total.toLocaleString('en-IN')} apartments have live listings. Showing the busiest ${outcome.societies.length}.`}
          </p>
          <div className="space-y-2">
            {outcome.societies.map((society) => (
              <SocietySummaryCard key={society.slug} society={society} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
