import { Fragment, type ReactNode } from 'react';
import { SocietyRentTable } from '@/components/society/society-rent-table';
import { FURNISHING_LABELS, PROPERTY_TYPE_LABELS } from '@/constants/labels';
import { SHORTLIST_NEAR_METRO_M, SHORTLIST_TOP_AREAS } from '@/constants/shortlist';
import { formatRadius, humanize, rupees } from '@/utils/format';
import { shortlistSizeHref } from '@/utils/shortlist';
import type { ShortlistInsights as Insights, Spread, Tally } from '@/utils/shortlist-insights';

interface Item {
  key: string;
  node: ReactNode;
}

const range = (s: Spread): string => (s.low === s.high ? rupees(s.low) : `${rupees(s.low)} – ${rupees(s.high)}`);

export function ShortlistInsights({ insights, activeSize }: { insights: Insights; activeSize: number | null }) {
  const { homes, rent, moveIn, byBedrooms, rentCuts, cheaperElsewhere } = insights;
  const ofHomes = (n: number) => `${n} of ${homes}`;

  const areas = insights.areas.slice(0, SHORTLIST_TOP_AREAS);
  const moreAreas = insights.areas.length - areas.length;
  const mix: Array<{ label: string; items: Item[] }> = [
    {
      label: 'Areas',
      items: [
        ...counted(areas, (key) => key),
        ...(moreAreas > 0 ? [{ key: 'more', node: <span className="text-muted">+{moreAreas} more</span> }] : []),
      ],
    },
    { label: 'Furnishing', items: counted(insights.furnishing, (key) => FURNISHING_LABELS[key] || humanize(key)) },
  ];
  if (insights.propertyTypes.length > 1) {
    mix.push({ label: 'Type', items: counted(insights.propertyTypes, (key) => PROPERTY_TYPE_LABELS[key] ?? humanize(key)) });
  }

  const signals: Item[] = [];
  if (rentCuts > 0) {
    signals.push({
      key: 'rent-cuts',
      node: <span className="text-warn">{`${rentCuts} had a recent rent cut`}</span>,
    });
  }
  if (cheaperElsewhere > 0) {
    signals.push({
      key: 'cheaper-elsewhere',
      node: (
        <span className="text-good">
          {`${cheaperElsewhere} ${cheaperElsewhere === 1 ? 'is' : 'are'} listed for less on another portal`}
        </span>
      ),
    });
  }

  const rows = mix.filter((row) => row.items.length > 0);
  const hasBreakdown = byBedrooms.length > 1 || rows.length > 0 || signals.length > 0;
  const breakdown = (
    <div className="grid gap-6 lg:grid-cols-2">
      {byBedrooms.length > 1 && (
        <SocietyRentTable
          stats={byBedrooms}
          unitsLabel="Saved"
          sizeHref={(bedrooms) => shortlistSizeHref(bedrooms === activeSize ? null : bedrooms)}
          activeBedrooms={activeSize}
        />
      )}

      <div className="flex flex-col gap-3 text-[13px] text-second">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2">
          {rows.map((row) => (
            <Fragment key={row.label}>
              <dt className="label">{row.label}</dt>
              <dd>
                <Dotted items={row.items} />
              </dd>
            </Fragment>
          ))}
        </dl>
        {signals.length > 0 && (
          <p>
            <Dotted items={signals} />
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section aria-label="Shortlist summary" className="border-b border-ink py-5">
      <div className="grid grid-cols-2 border-t border-l border-ink sm:grid-cols-4">
        <Stat label="Median rent" value={rupees(rent.median)} notes={[range(rent)]} />
        <Stat
          label="Median move-in"
          value={moveIn ? rupees(moveIn.median) : null}
          notes={
            moveIn
              ? [range(moveIn), moveIn.known < homes ? `${moveIn.known} of ${homes} known` : null]
              : ['No usable deposit listed']
          }
        />
        <Stat
          label="Owner-listed"
          value={ofHomes(insights.ownerListed)}
          notes={[insights.ownerListed > 0 ? 'no brokerage' : null]}
        />
        <Stat
          label={`Metro within ${formatRadius(SHORTLIST_NEAR_METRO_M)}`}
          value={ofHomes(insights.nearMetro)}
          notes={[insights.unlocated > 0 ? `${insights.unlocated} without a precise location` : null]}
        />
      </div>

      {hasBreakdown && (
        <>
          <div className="hidden pt-5 sm:block">{breakdown}</div>
          <details className="group pt-3 sm:hidden">
            <summary className="label block w-fit cursor-pointer list-none py-1 underline underline-offset-4 hover:text-warn [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show breakdown</span>
              <span className="hidden group-open:inline">Hide breakdown</span>
            </summary>
            <div className="rise pt-3">{breakdown}</div>
          </details>
        </>
      )}
    </section>
  );
}

function counted<K extends string>(tallies: Tally<K>[], label: (key: K) => string): Item[] {
  return tallies.map((t) => ({
    key: t.key,
    node: (
      <span>
        {label(t.key)} <span className="tabular font-mono text-[11px] text-muted">{t.count}</span>
      </span>
    ),
  }));
}

function Dotted({ items }: { items: Item[] }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && (
            <span aria-hidden className="text-rule">
              ·
            </span>
          )}
          {item.node}
        </Fragment>
      ))}
    </span>
  );
}

function Stat({ label, value, notes }: { label: string; value: string | null; notes: Array<string | null> }) {
  const shown = notes.filter(Boolean);
  return (
    <div className="border-r border-b border-ink bg-sheet p-3 sm:p-4">
      <p className="label">{label}</p>
      <p className={`tabular mt-2 font-display text-[28px] leading-none ${value === null ? 'text-muted' : 'text-ink'}`}>
        {value ?? 'Not listed'}
      </p>
      {shown.length > 0 && <p className="tabular mt-2 text-[12px] text-second">{shown.join(' · ')}</p>}
    </div>
  );
}
