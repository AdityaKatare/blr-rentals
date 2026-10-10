import { DEFAULT_RADIUS_KM } from '@blr/core';
import { Notice } from '@/components/ui/notice';
import type { Region } from '@/utils/regions';
import { withParams, type Params } from '@/utils/search-params';
import { AreaTiles, type TileRegion } from './area-tiles';

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

  const tiles: TileRegion[] = regions.map((region) => ({
    key: region.key,
    name: region.name,
    areas: region.areas.map((area) => ({
      ...area,
      href: withParams(params, { locality: area.name, lat: null, lng: null, page: null }),
    })),
  }));

  return (
    <section aria-labelledby="areas-heading" className="rise flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-2">
        <h2 id="areas-heading" className="font-display text-[22px] leading-none sm:text-[26px]">
          Or start from an area
        </h2>
        <p className="label">Live rentals within {DEFAULT_RADIUS_KM} km · busiest first</p>
      </div>
      <AreaTiles regions={tiles} />
    </section>
  );
}
