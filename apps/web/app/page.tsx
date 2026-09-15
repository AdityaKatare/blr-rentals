import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES, SOURCE_SLUGS, SearchQuerySchema } from '@blr/core';
import { findLocality, listLocalities, searchListings, type LocalityMatch, type SearchResult } from '@blr/db';
import { getDb } from '@/lib/db';
import { activeFilters, BHK_OPTIONS, clearFiltersHref } from '@/lib/filters';
import { FURNISHING_LABELS, humanize, PROPERTY_TYPE_LABELS, SOURCE_LABELS } from '@/lib/format';
import { first, list, parseParams, SORTS, withParams, type Params } from '@/lib/search-params';
import { parseShortlist, SHORTLIST_COOKIE } from '@/lib/shortlist';
import { ListingCard } from './listing-card';
import { SearchShell } from './search-shell';

export const dynamic = 'force-dynamic';

const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  relevance: 'Best match',
  rent_asc: 'Rent: low to high',
  distance: 'Nearest',
  newest: 'Recently updated',
};

const RADII = [1, 2, 3, 5, 8, 10, 15];

type Outcome =
  | { kind: 'ok'; result: SearchResult; localities: LocalityMatch[] }
  | { kind: 'unknown-locality'; text: string; localities: LocalityMatch[] }
  | { kind: 'invalid'; issues: string[]; localities: LocalityMatch[] }
  | { kind: 'db-error'; message: string };

async function run(sp: Params): Promise<Outcome> {
  const parsed = parseParams(sp);
  try {
    const { sql } = getDb();
    const localities = await listLocalities(sql);
    let center: { lat: number; lng: number } | { localityId: number };
    if (parsed.explicitCenter) {
      center = parsed.explicitCenter;
    } else {
      const match = await findLocality(sql, parsed.localityText);
      if (!match) return { kind: 'unknown-locality', text: parsed.localityText, localities };
      center = { localityId: match.id };
    }
    const bedrooms = parsed.query.bedrooms ?? [];
    const withLargeHomes = bedrooms.includes(4) ? [...new Set([...bedrooms, 5, 6, 7, 8, 9, 10])] : bedrooms;
    const query = SearchQuerySchema.safeParse({ ...parsed.query, bedrooms: withLargeHomes, center });
    if (!query.success) {
      return { kind: 'invalid', issues: query.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), localities };
    }
    return { kind: 'ok', result: await searchListings(sql, query.data), localities };
  } catch (err) {
    return { kind: 'db-error', message: err instanceof Error ? err.message : String(err) };
  }
}

function Checkbox({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="accent-zinc-900" />
      {label}
    </label>
  );
}

function Chip({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-zinc-300 px-3 py-1 text-sm peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400">
        {label}
      </span>
    </label>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const parsed = parseParams(sp);
  const outcome = await run(sp);
  const saved = new Set(parseShortlist((await cookies()).get(SHORTLIST_COOKIE)?.value));
  const chips = activeFilters(sp);

  const bedrooms = list(sp.bedrooms);
  const furnishing = list(sp.furnishing);
  const propertyTypes = list(sp.propertyTypes);
  const amenities = list(sp.amenities);
  const sources = list(sp.sources);
  const sort = parsed.query.sort ?? 'relevance';
  const radiusKm = parsed.query.radiusKm ?? 5;

  return (
    <SearchShell
      activeCount={chips.length}
      total={outcome.kind === 'ok' ? outcome.result.total : null}
      fields={
        <>
          <div>
            <label htmlFor="locality" className="text-sm font-medium">
              Near
            </label>
            <input
              id="locality"
              name="locality"
              list="localities"
              defaultValue={parsed.explicitCenter ? '' : parsed.localityText}
              placeholder="Koramangala, HSR, Whitefield…"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              autoComplete="off"
            />
            {'localities' in outcome && (
              <datalist id="localities">
                {outcome.localities.map((l) => (
                  <option key={l.id} value={l.name} />
                ))}
              </datalist>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Within
              <select name="radiusKm" defaultValue={String(radiusKm)} className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm font-normal">
                {(RADII.includes(radiusKm) ? RADII : [...RADII, radiusKm].sort((a, b) => a - b)).map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Sort
              <select name="sort" defaultValue={sort} className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm font-normal">
                {SORTS.map((s) => (
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
              <input name="minRent" type="number" min={0} step={1000} placeholder="Min" defaultValue={first(sp.minRent) ?? ''} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              <input name="maxRent" type="number" min={0} step={1000} placeholder="Max" defaultValue={first(sp.maxRent) ?? ''} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Size</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BHK_OPTIONS.map((o) => (
                <Chip key={o.value} name="bedrooms" value={o.value} label={o.label} checked={bedrooms.includes(o.value)} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Furnishing</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FURNISHINGS.filter((f) => f !== 'unknown').map((f) => (
                <Chip key={f} name="furnishing" value={f} label={FURNISHING_LABELS[f] ?? f} checked={furnishing.includes(f)} />
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
            <Checkbox name="parking" value="required" label="Has parking" checked={first(sp.parking) === 'required'} />
            <Checkbox name="ownerOnly" value="on" label="Owner listings only" checked={first(sp.ownerOnly) === 'on'} />
            <label className="flex items-center justify-between gap-2 pt-1 text-sm">
              Available by
              <input name="availableBy" type="date" defaultValue={first(sp.availableBy) ?? ''} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
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
      }
    >
      <Results outcome={outcome} sp={sp} sort={sort} radiusKm={radiusKm} saved={saved} chips={chips} />
    </SearchShell>
  );
}

function Notice({ tone, title, children }: { tone: 'amber' | 'zinc'; title: string; children?: ReactNode }) {
  const styles = tone === 'amber' ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white';
  return (
    <div className={`rounded-xl border p-5 text-sm ${styles}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-zinc-600">{children}</div>}
    </div>
  );
}

interface ResultsProps {
  outcome: Outcome;
  sp: Params;
  sort: (typeof SORTS)[number];
  radiusKm: number;
  saved: Set<string>;
  chips: ReturnType<typeof activeFilters>;
}

function Results({ outcome, sp, sort, radiusKm, saved, chips }: ResultsProps) {
  if (outcome.kind === 'db-error') {
    return (
      <Notice tone="amber" title="Database unreachable">
        <p>{outcome.message}</p>
        <p className="mt-2">
          Start it with <code>pnpm db:up</code>, then <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
        </p>
      </Notice>
    );
  }
  if (outcome.kind === 'unknown-locality') {
    return (
      <Notice tone="amber" title={`No locality matches “${outcome.text}”`}>
        Try a nearby area, e.g. {outcome.localities.slice(0, 6).map((l) => l.name).join(', ')}.
      </Notice>
    );
  }
  if (outcome.kind === 'invalid') {
    return (
      <Notice tone="amber" title="Some filters are out of range">
        <ul className="list-disc pl-5">
          {outcome.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Notice>
    );
  }

  const { result } = outcome;
  const near = result.center.locality?.name ?? `${result.center.lat.toFixed(4)}, ${result.center.lng.toFixed(4)}`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">
          {result.total.toLocaleString('en-IN')} {result.total === 1 ? 'rental' : 'rentals'} within {radiusKm} km of {near}
        </h1>
        <p className="text-xs text-zinc-500">
          {SORT_LABELS[sort]} · {result.tookMs} ms
        </p>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              scroll={false}
              aria-label={`Remove filter ${c.label}`}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white py-0.5 pl-2.5 pr-1.5 text-xs hover:border-zinc-500"
            >
              {c.label}
              <span aria-hidden className="text-zinc-400">
                ✕
              </span>
            </Link>
          ))}
          {chips.length > 1 && (
            <Link href={clearFiltersHref(sp)} scroll={false} className="px-1.5 text-xs text-zinc-600 underline underline-offset-2">
              Clear all
            </Link>
          )}
        </div>
      )}

      {result.hits.length === 0 ? (
        <Notice tone="zinc" title="Nothing matches these filters yet">
          Widen the radius, raise the rent limit or clear some filters. Only areas the scraper has visited have listings.
        </Notice>
      ) : (
        <div className="space-y-3">
          {result.hits.map((hit) => (
            <ListingCard key={hit.id} hit={hit} saved={saved.has(hit.id)} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav className="flex items-center justify-between pt-2 text-sm">
          {result.page > 1 ? (
            <Link href={withParams(sp, { page: String(result.page - 1) })} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-zinc-500">
            Page {result.page} of {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link href={withParams(sp, { page: String(result.page + 1) })} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
