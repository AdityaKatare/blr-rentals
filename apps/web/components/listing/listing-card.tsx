import { formatBedrooms } from '@blr/core';
import type { SearchHit } from '@blr/db';
import { FURNISHING_LABELS, METRO_LINE_LABELS, METRO_LINE_STYLES, PROPERTY_TYPE_LABELS, SOURCE_LABELS } from '@/constants/labels';
import { availability, formatDistance, timeAgo } from '@/utils/format';
import { AlsoListed } from './also-listed';
import { ListingBadges } from './listing-badges';
import { ListingPrice } from './listing-price';
import { PhotoCarousel } from './photo-carousel';
import { ShortlistButton } from './shortlist-button';
import { SourceBadges } from './source-badges';

export function ListingCard({ hit, saved }: { hit: SearchHit; saved: boolean }) {
  const place = [hit.societyName, hit.locality].filter(Boolean).join(', ');
  const heading = `${formatBedrooms(hit)} ${place ? `in ${place}` : ''}`.trim();
  const sourceLabel = SOURCE_LABELS[hit.source] ?? hit.source;
  const updated = timeAgo(hit.updatedAt);
  const perSqft = hit.areaSqft ? Math.round(hit.rent / hit.areaSqft) : null;
  const facts = [
    PROPERTY_TYPE_LABELS[hit.propertyType],
    hit.areaSqft ? `${hit.areaSqft.toLocaleString('en-IN')} sqft · ₹${perSqft}/sqft` : null,
    FURNISHING_LABELS[hit.furnishing] || null,
    hit.bathrooms ? `${hit.bathrooms} bath` : null,
  ].filter(Boolean);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row ${hit.status === 'active' ? '' : 'opacity-70'}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-zinc-100 sm:aspect-auto sm:min-h-44 sm:w-60">
        <PhotoCarousel
          images={hit.images}
          total={hit.imageCount}
          title={heading}
          sourceUrl={hit.sourceUrl}
          sourceLabel={sourceLabel}
        />
        <div className="absolute right-2 top-2">
          <ShortlistButton id={hit.id} saved={saved} />
        </div>
        <ListingBadges hit={hit} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <ListingPrice hit={hit} />
          <SourceBadges sources={hit.sources} />
        </div>

        <h2 className="truncate font-medium" title={hit.title}>
          {heading}
        </h2>

        <p className="text-sm text-zinc-600">{facts.join(' · ')}</p>

        <AlsoListed hit={hit} />

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-zinc-500">
          {hit.distanceM !== null && (
            <span>
              {formatDistance(hit.distanceM)} away{hit.geoAccuracy !== 'exact' ? ' (approx.)' : ''}
            </span>
          )}
          {hit.nearestMetro && (
            <span
              className="inline-flex items-center gap-1"
              title={`Straight-line distance · ${hit.nearestMetro.lines.map((l) => METRO_LINE_LABELS[l]).join(' / ')}`}
            >
              {hit.nearestMetro.lines.map((l) => (
                <span key={l} aria-hidden className={`inline-block h-2 w-2 rounded-full ${METRO_LINE_STYLES[l]}`} />
              ))}
              {formatDistance(hit.nearestMetro.distanceM)} to {hit.nearestMetro.name} metro
              {hit.geoAccuracy !== 'exact' ? ' (approx.)' : ''}
            </span>
          )}
          {updated && <span>Updated {updated}</span>}
          {hit.rentDrop && <span className="text-amber-700">Rent cut {timeAgo(hit.rentDrop.at)}</span>}
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
