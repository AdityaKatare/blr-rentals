import { DEFAULT_RADIUS_KM } from '@blr/core';
import type { LocalityMatch, SearchResult, SocietyOption } from '@blr/db';
import { RADIUS_OPTIONS_KM } from '@/constants/search';
import { formatCoord } from '@/utils/map';
import { placeOptions } from '@/utils/search-options';
import type { ParsedParams } from '@/utils/search-params';
import { CenterPicker, MapPinChip } from './center-picker';
import { RadiusSelect } from './radius-select';
import { SearchCombobox } from './search-combobox';

interface SearchHeadlineProps {
  parsed: ParsedParams;
  localities: LocalityMatch[] | null;
  buildings: SocietyOption[];
  center: SearchResult['center'] | null;
  total: number | null;
  near: string | null;
}

const INHERIT = 'bg-transparent font-display text-[inherit] leading-none';

export function SearchHeadline({ parsed, localities, buildings, center, total, near }: SearchHeadlineProps) {
  const radiusKm = parsed.query.radiusKm ?? DEFAULT_RADIUS_KM;
  const radii = RADIUS_OPTIONS_KM.includes(radiusKm) ? RADIUS_OPTIONS_KM : [...RADIUS_OPTIONS_KM, radiusKm].sort((a, b) => a - b);
  const explicitCenter = parsed.explicitCenter;
  const nearestName = center?.nearest?.name ?? null;
  const counted = total === null ? 'Rentals' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'rental' : 'rentals'}`;

  const locality = (
    <SearchCombobox
      id="locality"
      name="locality"
      label="Areas and apartments"
      defaultValue={explicitCenter ? '' : parsed.localityText}
      placeholder={explicitCenter && near ? near : 'an area'}
      options={placeOptions(localities ?? [], buildings)}
      clearFields={['lat', 'lng']}
      wrapperClassName="relative inline-block max-w-full align-baseline"
      inputClassName={`max-w-full border-0 border-b-2 border-ink p-0 placeholder:text-muted ${INHERIT}`}
      autoSize
    />
  );

  const hidden = (
    <>
      <input type="hidden" name="lat" defaultValue={explicitCenter ? formatCoord(explicitCenter.lat) : ''} />
      <input type="hidden" name="lng" defaultValue={explicitCenter ? formatCoord(explicitCenter.lng) : ''} />
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h1 className="font-display text-[26px] leading-[1.25] sm:text-[32px] xl:text-[38px]">
          {counted} within <RadiusSelect name="radiusKm" label="Search radius" value={radiusKm} options={radii} /> of{' '}
          {locality}
          {hidden}
        </h1>

        <CenterPicker
          localities={localities ?? []}
          center={center ? { lat: center.lat, lng: center.lng } : explicitCenter}
          radiusKm={radiusKm}
          nearestName={nearestName}
          explicit={explicitCenter !== null}
        />
      </div>

      {explicitCenter && <MapPinChip point={explicitCenter} nearestName={nearestName} />}
    </div>
  );
}

