import type { SearchHit } from '@blr/db';
import { ago, availability, bhk, FURNISHING_LABELS, km, PROPERTY_TYPE_LABELS, rupees, SOURCE_LABELS, SOURCE_STYLES } from '@/lib/format';

export function ListingCard({ hit }: { hit: SearchHit }) {
  const sourceLabel = SOURCE_LABELS[hit.source] ?? hit.source;
  const place = [hit.societyName, hit.locality].filter(Boolean).join(', ');
  const updated = ago(hit.updatedAt);
  const facts = [
    PROPERTY_TYPE_LABELS[hit.propertyType],
    hit.areaSqft ? `${hit.areaSqft.toLocaleString('en-IN')} sqft` : null,
    FURNISHING_LABELS[hit.furnishing] || null,
    hit.bathrooms ? `${hit.bathrooms} bath` : null,
  ].filter(Boolean);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 bg-zinc-100 sm:aspect-auto sm:w-56">
        {hit.imageUrl ? (
          <img
            src={hit.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">No photo</div>
        )}
        {hit.imageCount > 1 && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            {hit.imageCount} photos
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight">
              {rupees(hit.rent)}
              <span className="text-sm font-normal text-zinc-500"> /month</span>
            </p>
            <p className="text-xs text-zinc-500">
              {hit.deposit ? `Deposit ${rupees(hit.deposit)}` : 'Deposit not listed'}
              {hit.maintenance ? ` · Maintenance ${rupees(hit.maintenance)}` : ''}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_STYLES[hit.source] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200'}`}>
            {sourceLabel}
          </span>
        </div>

        <h2 className="truncate font-medium" title={hit.title}>
          {bhk(hit)} {place ? `in ${place}` : ''}
        </h2>

        <p className="text-sm text-zinc-600">{facts.join(' · ')}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-zinc-500">
          <span>
            {km(hit.distanceM)} away{hit.geoAccuracy !== 'exact' ? ' (approx.)' : ''}
          </span>
          {updated && <span>Updated {updated}</span>}
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
