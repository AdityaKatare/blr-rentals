import {
  AMENITIES,
  FURNISHINGS,
  PROPERTY_TYPES,
  SOURCE_SLUGS,
  SearchQuerySchema,
  type SearchQueryInput,
} from '@blr/core';

type Params = Record<string, string | string[] | undefined>;

const num = (v: string | string[] | undefined): number | undefined => {
  if (typeof v !== 'string' || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const has = (v: string[], x: string) => v.includes(x);

function toQuery(sp: Params): SearchQueryInput {
  const q: SearchQueryInput = {
    // TODO(M4): resolve `locality` text via the localities table; until then lat/lng are explicit.
    center: { lat: num(sp.lat) ?? 12.9352, lng: num(sp.lng) ?? 77.6245 },
    radiusKm: num(sp.radiusKm) ?? 5,
    rent: { max: num(sp.maxRent) },
    bedrooms: list(sp.bedrooms).map(Number),
    parking: sp.parking === 'required' ? 'required' : 'any',
    listedBy: sp.ownerOnly === 'on' ? 'owner' : 'any',
    sort: (typeof sp.sort === 'string' ? sp.sort : 'relevance') as SearchQueryInput['sort'],
  };
  if (list(sp.furnishing).length) q.furnishing = list(sp.furnishing) as SearchQueryInput['furnishing'];
  if (list(sp.propertyTypes).length) q.propertyTypes = list(sp.propertyTypes) as SearchQueryInput['propertyTypes'];
  if (list(sp.amenities).length) q.amenitiesAll = list(sp.amenities) as SearchQueryInput['amenitiesAll'];
  if (list(sp.sources).length) q.sources = list(sp.sources) as SearchQueryInput['sources'];
  return q;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const submitted = Object.keys(sp).length > 0;
  const parsed = submitted ? SearchQuerySchema.safeParse(toQuery(sp)) : null;

  const bedrooms = list(sp.bedrooms);
  const furnishing = list(sp.furnishing);
  const propertyTypes = list(sp.propertyTypes);
  const amenities = list(sp.amenities);
  const sources = list(sp.sources);

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <form method="get" className="space-y-5 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <h1 className="text-base font-semibold">Find a rental</h1>

        <label className="block">
          <span className="text-zinc-600">Locality</span>
          <input name="locality" defaultValue={typeof sp.locality === 'string' ? sp.locality : 'Koramangala'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1" />
          <span className="text-xs text-zinc-500">Locality lookup lands in M4; lat/lng below drive the search for now.</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-zinc-600">Lat</span>
            <input name="lat" type="number" step="0.0001" defaultValue={typeof sp.lat === 'string' ? sp.lat : '12.9352'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="text-zinc-600">Lng</span>
            <input name="lng" type="number" step="0.0001" defaultValue={typeof sp.lng === 'string' ? sp.lng : '77.6245'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1" />
          </label>
        </div>

        <label className="block">
          <span className="text-zinc-600">Radius (km)</span>
          <input name="radiusKm" type="number" min={0.5} max={25} step={0.5} defaultValue={typeof sp.radiusKm === 'string' ? sp.radiusKm : '5'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1" />
        </label>

        <label className="block">
          <span className="text-zinc-600">Max rent (₹/month)</span>
          <input name="maxRent" type="number" min={1000} step={1000} defaultValue={typeof sp.maxRent === 'string' ? sp.maxRent : '30000'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1" />
        </label>

        <fieldset>
          <legend className="text-zinc-600">BHK</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {['0', '1', '2', '3', '4'].map((b) => (
              <label key={b} className="flex items-center gap-1">
                <input type="checkbox" name="bedrooms" value={b} defaultChecked={has(bedrooms, b)} />
                {b === '0' ? '1RK' : `${b} BHK`}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-zinc-600">Furnishing</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {FURNISHINGS.filter((f) => f !== 'unknown').map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input type="checkbox" name="furnishing" value={f} defaultChecked={has(furnishing, f)} />
                {f}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-zinc-600">Property type</span>
          <select name="propertyTypes" multiple defaultValue={propertyTypes} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1">
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-zinc-600">Amenities (all of)</legend>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {AMENITIES.map((a) => (
              <label key={a} className="flex items-center gap-1">
                <input type="checkbox" name="amenities" value={a} defaultChecked={has(amenities, a)} />
                {a.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1">
            <input type="checkbox" name="parking" value="required" defaultChecked={sp.parking === 'required'} /> parking required
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" name="ownerOnly" defaultChecked={sp.ownerOnly === 'on'} /> owner listings only
          </label>
        </div>

        <fieldset>
          <legend className="text-zinc-600">Sources</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {SOURCE_SLUGS.map((s) => (
              <label key={s} className="flex items-center gap-1">
                <input type="checkbox" name="sources" value={s} defaultChecked={has(sources, s)} />
                {s}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-zinc-600">Sort</span>
          <select name="sort" defaultValue={typeof sp.sort === 'string' ? sp.sort : 'relevance'} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1">
            <option value="relevance">relevance</option>
            <option value="rent_asc">rent, low to high</option>
            <option value="distance">distance</option>
            <option value="newest">newest</option>
          </select>
        </label>

        <button type="submit" className="w-full rounded bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700">
          Search
        </button>
      </form>

      <section className="space-y-4">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">Results land in M4.</p>
          <p className="mt-1">
            Cards will show rent, BHK, locality, area, furnishing, distance, posted date and a <strong>source badge</strong>, and link
            out to the original listing. Until the search API is wired, the form only proves the query contract.
          </p>
        </div>

        {parsed && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <h2 className="font-medium">{parsed.success ? 'Parsed SearchQuery' : 'Invalid query'}</h2>
            <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs">
              {JSON.stringify(parsed.success ? parsed.data : parsed.error.issues, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
