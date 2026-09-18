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
import { ListingPrice } from './listing-price';
import { ListingRowFrame } from './listing-row-frame';
import { PhotoCarousel } from './photo-carousel';
import { ShortlistButton } from './shortlist-button';

interface RowDetail {
  key: string;
  node: ReactNode;
}

export function ListingRow({ hit, saved }: { hit: SearchHit; saved: boolean }) {
  const place = [hit.societyName, hit.locality].filter(Boolean).join(', ');
  const heading = `${formatBedrooms(hit)} ${place ? `in ${place}` : ''}`.trim();
  const societyHref = hit.societySlug ? `/societies/${hit.societySlug}` : null;
  const sourceLabel = SOURCE_LABELS[hit.source] ?? hit.source;
  const updated = timeAgo(hit.updatedAt);

  const details: RowDetail[] = [];
  if (hit.nearestMetro) {
    details.push({
      key: 'metro',
      node: (
        <span
          className="inline-flex items-center gap-1.5"
          title={`Straight-line distance · ${hit.nearestMetro.lines.map((l) => METRO_LINE_LABELS[l]).join(' / ')}`}
        >
          <MetroLinesIcon lines={hit.nearestMetro.lines} />
          {formatDistance(hit.nearestMetro.distanceM)} to {hit.nearestMetro.name}
        </span>
      ),
    });
  } else {
    details.push({ key: 'metro', node: <span className="text-muted">No metro within 3 km</span> });
  }
  if (updated) details.push({ key: 'updated', node: <span>Updated {updated}</span> });
  if (hit.rentDrop) {
    details.push({ key: 'rent-drop', node: <span className="text-warn">Rent cut {timeAgo(hit.rentDrop.at)}</span> });
  }
  if (hit.availableFrom) details.push({ key: 'available', node: <span>{availability(hit.availableFrom)}</span> });

  const facts = [
    PROPERTY_TYPE_LABELS[hit.propertyType],
    hit.areaSqft ? `${hit.areaSqft.toLocaleString('en-IN')} sqft` : null,
    FURNISHING_LABELS[hit.furnishing] || null,
    hit.bathrooms ? `${hit.bathrooms} bath` : null,
    TENANT_PREFERENCE_LABELS[hit.tenantPreference] || null,
  ].filter(Boolean);

  return (
    <ListingRowFrame id={hit.id} dimmed={hit.status !== 'active'}>
      <div className="relative aspect-[3/2] w-full self-start bg-shade @md:col-start-1 @md:row-span-3 @3xl:row-span-1">
        <PhotoCarousel
          images={hit.images}
          total={hit.imageCount}
          title={heading}
          sourceUrl={hit.sourceUrl}
          sourceLabel={sourceLabel}
        />
        <ListingBadges hit={hit} />
      </div>

      <div className="@md:col-start-2 @md:row-start-1 @3xl:col-start-2 @3xl:row-start-1">
        <ListingPrice hit={hit} />
      </div>

      <div className="flex min-w-0 flex-col gap-2 @md:col-start-2 @md:row-start-2 @3xl:col-start-3 @3xl:row-start-1">
        <h2 className="text-[17px] leading-tight font-medium @3xl:text-[19px]" title={hit.title}>
          {societyHref && hit.societyName ? (
            <>
              {formatBedrooms(hit)} in{' '}
              <Link href={societyHref} className="underline decoration-rule underline-offset-4 hover:decoration-ink">
                {hit.societyName}
              </Link>
              {hit.locality ? `, ${hit.locality}` : ''}
            </>
          ) : (
            heading
          )}
        </h2>

        <p className="text-[14px] text-second">{facts.join(' · ')}</p>

        <AlsoListed hit={hit} />

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 font-mono text-[11px] text-second">
          {details.map((detail, i) => (
            <Fragment key={detail.key}>
              {i > 0 && (
                <span aria-hidden className="text-rule">
                  ·
                </span>
              )}
              {detail.node}
            </Fragment>
          ))}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 @md:col-start-2 @md:row-start-3 @3xl:col-start-4 @3xl:row-start-1 @3xl:flex-col @3xl:self-center">
        <a
          href={hit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center border border-ink bg-ink px-3 text-center font-mono text-[11px] leading-tight tracking-[0.04em] text-paper uppercase hover:bg-second @3xl:min-h-10 @3xl:flex-none"
        >
          Open on {sourceLabel}&nbsp;↗
        </a>
        <ShortlistButton id={hit.id} saved={saved} />
      </div>
    </ListingRowFrame>
  );
}
