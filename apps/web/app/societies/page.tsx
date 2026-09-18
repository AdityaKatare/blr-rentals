import Link from 'next/link';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { SearchCombobox } from '@/components/search/search-combobox';
import { SocietiesTable } from '@/components/society/societies-table';
import { buttonClass } from '@/components/ui/button';
import { DatabaseErrorNotice, Notice } from '@/components/ui/notice';
import { loadSocieties, loadSocietyNames } from '@/server/societies';
import { first, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Apartments' };

export default async function SocietiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const [outcome, names] = await Promise.all([loadSocieties(q), loadSocietyNames()]);

  return (
    <PageShell>
      <PageHeadline
        title="Apartments"
        aside={
          <Link href="/" className="label underline underline-offset-4 hover:text-warn">
            Back to search
          </Link>
        }
      >
        <p className="mt-2 max-w-2xl text-[13px] text-second">
          Every unit in one apartment, wherever it is in the city. Rent search by area lives on the{' '}
          <Link href="/" className="underline underline-offset-4">
            search page
          </Link>
          .
        </p>

        <form method="get" action="/societies" className="mt-4 flex max-w-xl gap-2">
          <div className="w-full">
            <SearchCombobox
              id="society-search"
              name="q"
              label="Apartments"
              defaultValue={q ?? ''}
              placeholder="Prestige Shantiniketan, Raintree, Sobha..."
              options={names.map((n) => ({ value: n.name, hint: `${n.units} ${n.units === 1 ? 'unit' : 'units'}` }))}
            />
          </div>
          <button type="submit" className={buttonClass('solid', 'md')}>
            Search
          </button>
        </form>
      </PageHeadline>

      <div className="py-6">
        {outcome.kind === 'db-error' ? (
          <DatabaseErrorNotice message={outcome.message} />
        ) : outcome.societies.length === 0 ? (
          <Notice tone="alert" title={q ? `No apartment matches “${q}”` : 'No apartments yet'}>
            Names come from the listings themselves, so only apartments the scraper has seen appear here. Try a shorter
            part of the name, such as the builder.
          </Notice>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-second">
              {q
                ? `${outcome.total.toLocaleString('en-IN')} ${outcome.total === 1 ? 'apartment' : 'apartments'} match “${q}”`
                : `${outcome.total.toLocaleString('en-IN')} apartments have live listings. Showing the busiest ${outcome.societies.length}.`}
            </p>
            <SocietiesTable societies={outcome.societies} />
          </>
        )}
      </div>
    </PageShell>
  );
}
