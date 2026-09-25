import { DEFAULT_RADIUS_KM } from '@blr/core';
import type { LocalityMatch, SocietyOption } from '@blr/db';
import { buttonClass } from '@/components/ui/button';
import { placeOptions } from '@/utils/search-options';
import type { ParsedParams } from '@/utils/search-params';
import { CenterPicker } from './center-picker';
import { SearchCombobox } from './search-combobox';

interface LandingHeroProps {
  parsed: ParsedParams;
  localities: LocalityMatch[] | null;
  buildings: SocietyOption[];
}

const HERO_INPUT = 'min-h-11 w-full border border-ink bg-sheet px-3 py-2 text-[15px] text-ink placeholder:text-muted';

export function LandingHero({ parsed, localities, buildings }: LandingHeroProps) {
  const radiusKm = parsed.query.radiusKm ?? DEFAULT_RADIUS_KM;

  return (
    <div className="rise flex min-h-[calc(100svh-201px)] flex-col justify-center gap-7 py-2 sm:min-h-[calc(100svh-173px)] sm:gap-9 sm:py-6 lg:min-h-[calc(100svh-189px)] lg:py-10">
      <div className="flex flex-col gap-3 sm:gap-4">
        <h1 className="max-w-3xl font-display text-[36px] leading-[1.02] sm:text-[52px] xl:text-[64px]">
          Find a place to rent in Bangalore.
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-second sm:text-[17px]">
          Every rental listing in one place, each flat once, sorted by what it costs to move in.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="locality" className="label">
          Where do you need to be?
        </label>
        <div className="flex w-full max-w-xl gap-2">
          <div className="min-w-0 flex-1">
            <SearchCombobox
              id="locality"
              name="locality"
              label="Areas and apartments"
              defaultValue=""
              placeholder="An area or apartment, e.g. Koramangala"
              options={placeOptions(localities ?? [], buildings)}
              clearFields={['lat', 'lng']}
              inputClassName={HERO_INPUT}
            />
          </div>
          <button type="submit" className={buttonClass('solid', 'lg', 'shrink-0')}>
            Search
          </button>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          or
          <CenterPicker localities={localities ?? []} center={null} radiusKm={radiusKm} nearestName={null} explicit={false} />
        </p>
        <input type="hidden" name="lat" defaultValue="" />
        <input type="hidden" name="lng" defaultValue="" />
      </div>
    </div>
  );
}
