import { Fragment, type ReactNode } from 'react';
import { formatBedrooms } from '@blr/core';
import type { SearchHit } from '@blr/db';
import Link from 'next/link';
import { MetroLinesIcon } from '@/components/ui/metro-lines-icon';
import {
  FURNISHING_LABELS,
  METRO_LINE_LABELS,
  PROPERTY_TYPE_LABELS,
  SOURCE_LABELS,
  TENANT_PREFERENCE_LABELS,
} from '@/constants/labels';
import { availability, formatDistance, timeAgo } from '@/utils/format';
import { AlsoListed } from './also-listed';
import { ListingBadges } from './listing-badges';
import { ListingCardFrame } from './listing-card-frame';
import { ListingPrice } from './listing-price';
import { PhotoCarousel } from './photo-carousel';
import { ShortlistButton } from './shortlist-button';
import { SourceBadges } from './source-badges';

interface CardDetail {
  key: string;
  node: ReactNode;
}

export function ListingCard({ hit, saved }: { hit: SearchHit; saved: boolean }) {
  const place = [hit.societyName, hit.locality].filter(Boolean).join(', ');
  const heading = `${formatBedrooms(hit)} ${place ? `in ${place}` : ''}`.trim();
  const societyHref = hit.societySlug ? `/societies/${hit.societySlug}` : null;
  const sourceLabel = SOURCE_LABELS[hit.source] ?? hit.source;
  const updated = timeAgo(hit.updatedAt);
  const perSqft = hit.areaSqft ? Math.round(hit.rent / hit.areaSqft) : null;
  const details: CardDetail[] = [];
  if (hit.nearestMetro) {
    details.push({
      key: 'metro',
      node: (
        <span
          className="inline-flex items-center gap-1"
          title={`Straight-line distance · ${hit.nearestMetro.lines.map((l) => METRO_LINE_LABELS[l]).join(' / ')}`}
        >
          <MetroLinesIcon lines={hit.nearestMetro.lines} />
          {formatDistance(hit.nearestMetro.distanceM)} to {hit.nearestMetro.name} metro
        </span>
      ),
    });
  }
  if (updated) details.push({ key: 'updated', node: <span>Updated {updated}</span> });
  if (hit.rentDrop) {
    details.push({ key: 'rent-drop', node: <span className="text-amber-700">Rent cut {timeAgo(hit.rentDrop.at)}</span> });
  }
  if (hit.availableFrom) details.push({ key: 'available', node: <span>{availability(hit.availableFrom)}</span> });
  const facts = [
    PROPERTY_TYPE_LABELS[hit.propertyType],
    hit.areaSqft ? `${hit.areaSqft.toLocaleString('en-IN')} sqft · ₹${perSqft}/sqft` : null,
    FURNISHING_LABELS[hit.furnishing] || null,
    hit.bathrooms ? `${hit.bathrooms} bath` : null,
    TENANT_PREFERENCE_LABELS[hit.tenantPreference] || null,
  ].filter(Boolean);

  return (
    <ListingCardFrame id={hit.id} dimmed={hit.status !== 'active'}>
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
          {societyHref && hit.societyName ? (
            <>
              {formatBedrooms(hit)} in{' '}
              <Link href={societyHref} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                {hit.societyName}
              </Link>
              {hit.locality ? `, ${hit.locality}` : ''}
            </>
          ) : (
            heading
          )}
        </h2>

        <p className="text-sm text-zinc-600">{facts.join(' · ')}</p>

        <AlsoListed hit={hit} />

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-zinc-500">
          {details.map((detail, i) => (
            <Fragment key={detail.key}>
              {i > 0 && <span aria-hidden className="font-bold text-zinc-400">·</span>}
              {detail.node}
            </Fragment>
          ))}
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
    </ListingCardFrame>
  );
}
