import { DEFAULT_RADIUS_KM } from '@blr/core';
import { FilterFields } from '@/components/search/filter-fields';
import { LandingHero } from '@/components/search/landing-hero';
import { Results } from '@/components/search/results';
import { SearchHeadline } from '@/components/search/search-headline';
import { SearchShell } from '@/components/search/search-shell';
import { SortSelect } from '@/components/search/sort-select';
import { loadSearch } from '@/server/search';
import { readShortlistIds } from '@/server/shortlist';
import { loadSocietyNames } from '@/server/societies';
import { activeFilters } from '@/utils/filters';
import { centerLabel } from '@/utils/map';
import { parseParams, type Params } from '@/utils/search-params';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const parsed = parseParams(params);
  const [outcome, savedIds, buildings] = await Promise.all([loadSearch(parsed), readShortlistIds(), loadSocietyNames()]);
  const chips = activeFilters(params);
  const center = outcome.kind === 'ok' ? outcome.result.center : null;
  const total = outcome.kind === 'ok' ? outcome.result.total : null;
  const localities = 'localities' in outcome ? outcome.localities : null;

  return (
    <SearchShell
      activeCount={chips.length}
      total={total}
      landing={!parsed.hasCenter}
      headline={
        parsed.hasCenter ? (
          <SearchHeadline
            parsed={parsed}
            localities={localities}
            buildings={buildings}
            center={center}
            total={total}
            near={center ? centerLabel(center) : null}
          />
        ) : (
          <LandingHero parsed={parsed} localities={localities} buildings={buildings} />
        )
      }
      fields={<FilterFields params={params} parsed={parsed} />}
      sort={<SortSelect value={parsed.query.sort ?? 'relevance'} />}
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
