import { POI_CATEGORIES, POI_CATEGORY_GROUPS, POI_CATEGORY_SPECS, type PoiCategory } from '@blr/core';
import { PopoverFilter } from '@/components/ui/popover-filter';
import { Select } from '@/components/ui/select';
import { POI_CATEGORY_LABELS, POI_GROUP_LABELS } from '@/constants/labels';
import { NEARBY_FILTER_NOTE } from '@/constants/search';
import { formatRadius } from '@/utils/format';
import { nearValue, type ParsedNear } from '@/utils/search-params';

export function NearbyFilter({ near }: { near: ParsedNear[] }) {
  const chosen = new Map(near.map((n) => [n.category, n.withinM]));

  const options = (category: PoiCategory) => {
    const current = chosen.get(category);
    const radii = [...POI_CATEGORY_SPECS[category].radiiM];
    if (current !== undefined && !radii.includes(current)) radii.push(current);
    return [
      { value: '', label: 'Any' },
      ...radii.sort((a, b) => a - b).map((m) => ({ value: nearValue({ category, withinM: m }), label: `≤ ${formatRadius(m)}` })),
    ];
  };

  return (
    <PopoverFilter
      label="Nearby"
      summary={near.length ? String(near.length) : null}
      width="lg:w-[30rem]"
      note={NEARBY_FILTER_NOTE}
    >
      <div className="flex flex-col gap-3">
        {POI_CATEGORY_GROUPS.map((group) => (
          <fieldset key={group} className="flex flex-col gap-1.5">
            <legend className="label mb-1.5">{POI_GROUP_LABELS[group]}</legend>
            <div className="flex flex-wrap gap-2">
              {POI_CATEGORIES.filter((c) => POI_CATEGORY_SPECS[c].group === group).map((c) => {
                const current = chosen.get(c);
                return (
                  <Select
                    key={c}
                    name="near"
                    label={POI_CATEGORY_LABELS[c]}
                    labelClassName="text-[13px] text-second"
                    defaultValue={current === undefined ? '' : nearValue({ category: c, withinM: current })}
                    options={options(c)}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </PopoverFilter>
  );
}
