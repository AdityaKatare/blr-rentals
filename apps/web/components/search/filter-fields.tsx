import {
  AMENITIES,
  DEFAULT_RADIUS_KM,
  FURNISHINGS,
  NEAR_METRO_OPTIONS_M,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  SOURCE_SLUGS,
} from '@blr/core';
import type { LocalityMatch, SearchResult } from '@blr/db';
import { Checkbox } from '@/components/ui/checkbox';
import { ChipCheckbox } from '@/components/ui/chip-checkbox';
import { FURNISHING_LABELS, NEAR_METRO_LABELS, PROPERTY_TYPE_LABELS, SORT_LABELS, SOURCE_LABELS } from '@/constants/labels';
import { BHK_OPTIONS, RADIUS_OPTIONS_KM } from '@/constants/search';
import { humanize } from '@/utils/format';
import { formatCoord } from '@/utils/map';
import { first, list, type Params, type ParsedParams } from '@/utils/search-params';
import { CenterPicker, MapPinChip } from './center-picker';

interface FilterFieldsProps {
  params: Params;
  parsed: ParsedParams;
  localities: LocalityMatch[] | null;
  center: SearchResult['center'] | null;
}

export function FilterFields({ params, parsed, localities, center }: FilterFieldsProps) {
  const bedrooms = list(params.bedrooms);
  const furnishing = list(params.furnishing);
  const propertyTypes = list(params.propertyTypes);
  const amenities = list(params.amenities);
  const sources = list(params.sources);
  const sort = parsed.query.sort ?? 'relevance';
  const radiusKm = parsed.query.radiusKm ?? DEFAULT_RADIUS_KM;
  const radii = RADIUS_OPTIONS_KM.includes(radiusKm) ? RADIUS_OPTIONS_KM : [...RADIUS_OPTIONS_KM, radiusKm].sort((a, b) => a - b);
  const explicitCenter = parsed.explicitCenter;
  const nearestName = center?.nearest?.name ?? null;

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="locality" className="text-sm font-medium">
            Near
          </label>
          <CenterPicker
            localities={localities ?? []}
            center={center ? { lat: center.lat, lng: center.lng } : explicitCenter}
            radiusKm={radiusKm}
            nearestName={nearestName}
            explicit={explicitCenter !== null}
          />
        </div>
        <input
          id="locality"
          name="locality"
          list="localities"
          defaultValue={parsed.explicitCenter ? '' : parsed.localityText}
          placeholder="Koramangala, HSR, Whitefield…"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <input type="hidden" name="lat" defaultValue={explicitCenter ? formatCoord(explicitCenter.lat) : ''} />
        <input type="hidden" name="lng" defaultValue={explicitCenter ? formatCoord(explicitCenter.lng) : ''} />
        {explicitCenter && <MapPinChip point={explicitCenter} nearestName={nearestName} />}
        {localities && (
          <datalist id="localities">
            {localities.map((l) => (
              <option key={l.id} value={l.name} />
            ))}
          </datalist>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Within
          <select name="radiusKm" defaultValue={String(radiusKm)} className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm font-normal">
            {radii.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Sort
          <select name="sort" defaultValue={sort} className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm font-normal">
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Rent (₹/month)</legend>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <input name="minRent" type="number" min={0} step={1000} placeholder="Min" defaultValue={first(params.minRent) ?? ''} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          <input name="maxRent" type="number" min={0} step={1000} placeholder="Max" defaultValue={first(params.maxRent) ?? ''} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BHK_OPTIONS.map((o) => (
            <ChipCheckbox key={o.value} name="bedrooms" value={o.value} label={o.label} checked={bedrooms.includes(o.value)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Furnishing</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FURNISHINGS.filter((f) => f !== 'unknown').map((f) => (
            <ChipCheckbox key={f} name="furnishing" value={f} label={FURNISHING_LABELS[f] ?? f} checked={furnishing.includes(f)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Property type</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {PROPERTY_TYPES.filter((t) => t !== 'other').map((t) => (
            <Checkbox key={t} name="propertyTypes" value={t} label={PROPERTY_TYPE_LABELS[t] ?? t} checked={propertyTypes.includes(t)} />
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Checkbox name="parking" value="required" label="Has parking" checked={first(params.parking) === 'required'} />
        <Checkbox name="ownerOnly" value="on" label="Owner listings only" checked={first(params.ownerOnly) === 'on'} />
        <label className="flex items-center justify-between gap-2 pt-1 text-sm">
          Available by
          <input name="availableBy" type="date" defaultValue={first(params.availableBy) ?? ''} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
        </label>
        <label className="flex items-center justify-between gap-2 pt-1 text-sm">
          Near metro
          <select
            name="nearMetro"
            defaultValue={parsed.query.nearMetroM ? String(parsed.query.nearMetroM) : ''}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">Any distance</option>
            {NEAR_METRO_OPTIONS_M.map((m) => (
              <option key={m} value={m}>
                Within {NEAR_METRO_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details open={amenities.length > 0}>
        <summary className="cursor-pointer text-sm font-medium">
          Amenities{amenities.length ? ` (${amenities.length})` : ''}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {AMENITIES.map((a) => (
            <Checkbox key={a} name="amenities" value={a} label={humanize(a)} checked={amenities.includes(a)} />
          ))}
        </div>
      </details>

      <fieldset>
        <legend className="text-sm font-medium">Sources</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {SOURCE_SLUGS.map((s) => (
            <Checkbox key={s} name="sources" value={s} label={SOURCE_LABELS[s] ?? s} checked={sources.includes(s)} />
          ))}
        </div>
      </fieldset>
    </>
  );
}
