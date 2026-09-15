import type { SearchHit } from '@blr/db';
import {
  ago,
  availability,
  bhk,
  FURNISHING_LABELS,
  isNewListing,
  km,
  PROPERTY_TYPE_LABELS,
  rupees,
  SOURCE_LABELS,
  SOURCE_STYLES,
} from '@/lib/format';
import { PhotoCarousel } from './photo-carousel';
import { ShortlistButton } from './shortlist-button';

export function ListingCard({ hit, saved }: { hit: SearchHit; saved: boolean }) {
  const sourceLabel = SOURCE_LABELS[hit.source] ?? hit.source;
  const place = [hit.societyName, hit.locality].filter(Boolean).join(', ');
  const updated = ago(hit.updatedAt);
  const active = hit.status === 'active';
  const perSqft = hit.areaSqft ? Math.round(hit.rent / hit.areaSqft) : null;
  const facts = [
    PROPERTY_TYPE_LABELS[hit.propertyType],
    hit.areaSqft ? `${hit.areaSqft.toLocaleString('en-IN')} sqft · ₹${perSqft}/sqft` : null,
    FURNISHING_LABELS[hit.furnishing] || null,
    hit.bathrooms ? `${hit.bathrooms} bath` : null,
  ].filter(Boolean);
  const cheaperElsewhere = hit.otherListings.filter((o) => o.rent < hit.rent);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row ${active ? '' : 'opacity-70'}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-zinc-100 sm:aspect-auto sm:min-h-44 sm:w-60">
        <PhotoCarousel images={hit.images} total={hit.imageCount} />
        <div className="absolute right-2 top-2">
          <ShortlistButton id={hit.id} saved={saved} />
        </div>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {!active && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium text-white">No longer listed</span>}
          {active && isNewListing(hit.postedAt) && (
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white">New</span>
          )}
          {active && hit.rentDrop && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-medium text-white">Price dropped</span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight">
              {hit.rentDrop && <span className="mr-1.5 text-sm font-normal text-zinc-400 line-through">{rupees(hit.rentDrop.from)}</span>}
              {rupees(hit.rent)}
              <span className="text-sm font-normal text-zinc-500"> /month</span>
            </p>
            <p className="text-xs text-zinc-500">
              {hit.maintenance ? (
                <>
                  <span className="font-medium text-zinc-700">{rupees(hit.rent + hit.maintenance)} total</span> incl. {rupees(hit.maintenance)} maintenance
                </>
              ) : (
                'Maintenance not listed'
              )}
              {' · '}
              {hit.deposit ? `Deposit ${rupees(hit.deposit)}` : 'Deposit not listed'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {hit.sources.map((s) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_STYLES[s] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200'}`}>
                {SOURCE_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </div>

        <h2 className="truncate font-medium" title={hit.title}>
          {bhk(hit)} {place ? `in ${place}` : ''}
        </h2>

        <p className="text-sm text-zinc-600">{facts.join(' · ')}</p>

        {hit.otherListings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">
              {hit.otherListings.length === 1 ? 'Also listed' : `Also listed ${hit.otherListings.length} more times`}:
            </span>
            {hit.otherListings.map((o) => (
              <a
                key={o.id}
                href={o.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full border px-2 py-0.5 hover:border-zinc-400 ${o.rent < hit.rent ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-700'}`}
              >
                {SOURCE_LABELS[o.source] ?? o.source} {rupees(o.rent)} ↗
              </a>
            ))}
            {cheaperElsewhere.length > 0 && (
              <span className="text-emerald-700">{rupees(hit.rent - Math.min(...cheaperElsewhere.map((o) => o.rent)))} cheaper elsewhere</span>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-zinc-500">
          {hit.distanceM !== null && (
            <span>
              {km(hit.distanceM)} away{hit.geoAccuracy !== 'exact' ? ' (approx.)' : ''}
            </span>
          )}
          {updated && <span>Updated {updated}</span>}
          {hit.rentDrop && <span className="text-amber-700">Rent cut {ago(hit.rentDrop.at)}</span>}
          {hit.availableFrom && <span>{availability(hit.availableFrom)}</span>}
          {hit.listedBy === 'owner' && <span className="text-emerald-700">Owner</span>}
          <a
            href={hit.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            Open on {sourceLabel} ↗
          </a>
        </div>
      </div>
    </article>
  );
}
