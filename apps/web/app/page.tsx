import { DEFAULT_RADIUS_KM } from '@blr/core';
import { FilterFields } from '@/components/search/filter-fields';
import { Results } from '@/components/search/results';
import { SearchHeadline } from '@/components/search/search-headline';
import { SearchShell } from '@/components/search/search-shell';
import { loadSearch } from '@/server/search';
import { readShortlistIds } from '@/server/shortlist';
import { activeFilters } from '@/utils/filters';
import { centerLabel } from '@/utils/map';
import { parseParams, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const parsed = parseParams(params);
  const [outcome, savedIds] = await Promise.all([loadSearch(parsed), readShortlistIds()]);
  const chips = activeFilters(params);
  const center = outcome.kind === 'ok' ? outcome.result.center : null;
  const total = outcome.kind === 'ok' ? outcome.result.total : null;

  return (
    <SearchShell
      activeCount={chips.length}
      total={total}
      headline={
        <SearchHeadline
          parsed={parsed}
          localities={'localities' in outcome ? outcome.localities : null}
          center={center}
          total={total}
          near={center ? centerLabel(center) : null}
        />
      }
      fields={<FilterFields params={params} parsed={parsed} />}
    >
      <Results
        outcome={outcome}
        params={params}
        sort={parsed.query.sort ?? 'relevance'}
        radiusKm={parsed.query.radiusKm ?? DEFAULT_RADIUS_KM}
        saved={new Set(savedIds)}
        chips={chips}
      />
    </SearchShell>
  );
}
