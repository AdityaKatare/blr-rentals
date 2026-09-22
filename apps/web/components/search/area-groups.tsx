import { DEFAULT_RADIUS_KM } from '@blr/core';
import Link from 'next/link';
import { Notice } from '@/components/ui/notice';
import type { AreaOption, Region } from '@/utils/regions';
import { withParams, type Params } from '@/utils/search-params';

const SHOWN_PER_REGION = 6;

interface AreaGroupsProps {
  regions: Region[];
  params: Params;
}

export function AreaGroups({ regions, params }: AreaGroupsProps) {
  if (regions.length === 0) {
    return (
      <Notice tone="plain" title="No areas have listings yet">
        Areas appear here once the scraper has visited them. Until then, type an area above to try it anyway.
      </Notice>
    );
  }

  return (
    <section aria-labelledby="areas-heading" className="rise flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-2">
        <h2 id="areas-heading" className="font-display text-[22px] leading-none sm:text-[26px]">
          Or start from an area
        </h2>
        <p className="label">Live rentals within {DEFAULT_RADIUS_KM} km · busiest first</p>
      </div>
      {regions.map((region) => (
        <RegionRow key={region.key} region={region} params={params} />
      ))}
    </section>
  );
}

function RegionRow({ region, params }: { region: Region; params: Params }) {
  const shown = region.areas.slice(0, SHOWN_PER_REGION);
  const rest = region.areas.slice(SHOWN_PER_REGION);

  return (
    <div className="grid gap-x-8 gap-y-2 border-b border-hair py-4 sm:grid-cols-[112px_minmax(0,1fr)]">
      <h3 className="label pt-1.5">
        {region.name} <span className="tabular">· {region.areas.length}</span>
      </h3>
      <div className="flex flex-col gap-1">
        <AreaList areas={shown} params={params} />
        {rest.length > 0 && (
          <details className="group">
            <summary className="label block w-fit cursor-pointer list-none py-1 underline underline-offset-4 hover:text-warn [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">+{rest.length} more</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <div className="rise pt-1">
              <AreaList areas={rest} params={params} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function AreaList({ areas, params }: { areas: AreaOption[]; params: Params }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-0.5">
      {areas.map((area) => (
        <li key={area.name}>
          <Link
            href={withParams(params, { locality: area.name, lat: null, lng: null, page: null })}
            className="inline-flex items-baseline gap-1.5 py-1 text-[14px] underline decoration-hair underline-offset-4 transition-colors hover:decoration-ink"
          >
            {area.name}
            <span className="tabular font-mono text-[11px] text-muted">{area.listings.toLocaleString('en-IN')}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
