import type { NearestMetro } from '@blr/db';
import { MetroLinesIcon } from '@/components/ui/metro-lines-icon';
import { METRO_LINE_LABELS } from '@/constants/labels';
import { formatDistance } from '@/utils/format';

export function NearestMetroLabel({ metro }: { metro: NearestMetro }) {
  return (
    <span
      className="[&>span:first-child]:mr-1.5"
      title={`Straight-line distance from the middle of the apartment · ${metro.lines
        .map((l) => METRO_LINE_LABELS[l])
        .join(' / ')}`}
    >
      <MetroLinesIcon lines={metro.lines} />
      {formatDistance(metro.distanceM)} to {metro.name} metro
    </span>
  );
}
