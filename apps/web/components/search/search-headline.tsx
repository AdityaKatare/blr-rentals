import { DEFAULT_RADIUS_KM, SORT_OPTIONS } from '@blr/core';
import type { LocalityMatch, SearchResult } from '@blr/db';
import { Select } from '@/components/ui/select';
import { SORT_LABELS } from '@/constants/labels';
import { DEFAULT_LOCALITY, RADIUS_OPTIONS_KM } from '@/constants/search';
import { formatCoord } from '@/utils/map';
import type { ParsedParams } from '@/utils/search-params';
import { CenterPicker, MapPinChip } from './center-picker';
import { SearchCombobox } from './search-combobox';

interface SearchHeadlineProps {
  parsed: ParsedParams;
  localities: LocalityMatch[] | null;
  center: SearchResult['center'] | null;
  total: number | null;
  near: string | null;
}

const FIELD = 'relative inline-flex items-baseline border-b-2 border-ink align-baseline';
const INHERIT = 'bg-transparent font-display text-[inherit] leading-none';
const NATIVE = `cursor-pointer appearance-none pr-[0.8em] ${INHERIT}`;

export function SearchHeadline({ parsed, localities, center, total, near }: SearchHeadlineProps) {
  const sort = parsed.query.sort ?? 'relevance';
  const radiusKm = parsed.query.radiusKm ?? DEFAULT_RADIUS_KM;
  const radii = RADIUS_OPTIONS_KM.includes(radiusKm) ? RADIUS_OPTIONS_KM : [...RADIUS_OPTIONS_KM, radiusKm].sort((a, b) => a - b);
  const explicitCenter = parsed.explicitCenter;
  const nearestName = center?.nearest?.name ?? null;
  const counted = total === null ? 'Rentals' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'rental' : 'rentals'}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h1 className="font-display text-[26px] leading-[1.25] sm:text-[32px] xl:text-[38px]">
          {counted} within{' '}
          <label className={FIELD}>
            <span className="sr-only">Radius</span>
            <select name="radiusKm" defaultValue={String(radiusKm)} className={NATIVE}>
              {radii.map((r) => (
                <option key={r} value={r} className="font-sans text-[13px]">
                  {r} km
                </option>
              ))}
            </select>
            <Caret />
          </label>{' '}
          of{' '}
          <SearchCombobox
            id="locality"
            name="locality"
            label="Localities"
            defaultValue={explicitCenter ? '' : parsed.localityText}
            placeholder={explicitCenter && near ? near : DEFAULT_LOCALITY}
            options={(localities ?? []).map((l) => ({ value: l.name, hint: l.aliases.join(', ') || null }))}
            clearFields={['lat', 'lng']}
            wrapperClassName="relative inline-block max-w-full align-baseline"
            inputClassName={`max-w-full border-0 border-b-2 border-ink p-0 placeholder:text-muted ${INHERIT}`}
            autoSize
          />
          <input type="hidden" name="lat" defaultValue={explicitCenter ? formatCoord(explicitCenter.lat) : ''} />
          <input type="hidden" name="lng" defaultValue={explicitCenter ? formatCoord(explicitCenter.lng) : ''} />
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <CenterPicker
            localities={localities ?? []}
            center={center ? { lat: center.lat, lng: center.lng } : explicitCenter}
            radiusKm={radiusKm}
            nearestName={nearestName}
            explicit={explicitCenter !== null}
          />
          <Select
            name="sort"
            label="Sort"
            defaultValue={sort}
            options={SORT_OPTIONS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          />
        </div>
      </div>

      {explicitCenter && <MapPinChip point={explicitCenter} nearestName={nearestName} />}
    </div>
  );
}

function Caret() {
  return (
    <span aria-hidden className="pointer-events-none absolute right-0 bottom-[0.25em] text-[0.45em] leading-none">
      ▾
    </span>
  );
}
