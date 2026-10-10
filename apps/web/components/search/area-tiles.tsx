'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import type { AreaOption, RegionKey } from '@/utils/regions';

const SHOWN_PER_TILE = 3;
const SHOWN_PER_WIDE_TILE = 6;
const ROW_PX = 4;
const GAP_PX = 12;
const TWO_COLUMN_QUERY = '(min-width: 40rem)';

export interface TileArea extends AreaOption {
  href: string;
}

export interface TileRegion {
  key: RegionKey;
  name: string;
  areas: TileArea[];
}

export function AreaTiles({ regions }: { regions: TileRegion[] }) {
  const lastIsAlone = regions.length % 2 === 0;
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const tiles = [...grid.children] as HTMLElement[];
    const pack = () => {
      const twoColumns = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const bottoms: [number, number] = [1, 1];
      let stackColumn: 0 | 1 | null = null;
      for (const tile of tiles) {
        const span = Math.ceil((tile.offsetHeight + GAP_PX) / ROW_PX);
        if (!twoColumns) {
          tile.style.gridColumn = '';
          tile.style.gridRow = `span ${span}`;
          continue;
        }
        if (tile.dataset.wide !== undefined) {
          const start = Math.max(...bottoms);
          tile.style.gridColumn = '1 / -1';
          tile.style.gridRow = `${start} / span ${span}`;
          bottoms.fill(start + span);
          stackColumn = null;
          continue;
        }
        const column: 0 | 1 = stackColumn ?? (bottoms[1] < bottoms[0] ? 1 : 0);
        tile.style.gridColumn = String(column + 1);
        tile.style.gridRow = `${bottoms[column]} / span ${span}`;
        bottoms[column] += span;
        if (tile.dataset.open !== undefined) stackColumn = column === 0 ? 1 : 0;
      }
    };
    pack();
    grid.dataset.packed = '';
    const observer = new ResizeObserver(pack);
    observer.observe(grid);
    for (const tile of tiles) observer.observe(tile);
    return () => observer.disconnect();
  }, [regions]);

  return (
    <div
      ref={gridRef}
      className="grid items-start gap-3 pt-6 sm:grid-cols-2 data-packed:auto-rows-[4px] data-packed:gap-y-0"
    >
      {regions.map((region, i) => (
        <RegionTile key={region.key} region={region} wide={i === 0 || (lastIsAlone && i === regions.length - 1)} />
      ))}
    </div>
  );
}

function RegionTile({ region, wide }: { region: TileRegion; wide: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const limit = wide ? SHOWN_PER_WIDE_TILE : SHOWN_PER_TILE;
  const shown = isOpen ? region.areas : region.areas.slice(0, limit);
  const hidden = region.areas.length - limit;
  const listId = `areas-${region.key}`;

  return (
    <div
      data-wide={wide || undefined}
      data-open={isOpen || undefined}
      className={`flex flex-col gap-2.5 border border-ink bg-sheet px-4 py-4 transition-[translate,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sheet sm:px-5 ${wide ? 'sm:col-span-2' : ''} ${isOpen ? '-translate-x-0.5 -translate-y-0.5 shadow-sheet' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[26px] leading-none sm:text-[28px]">{region.name}</h3>
        <span className="tabular font-mono text-[11px] text-muted">{region.areas.length} areas</span>
      </div>
      <ul
        id={listId}
        className={
          !wide
            ? 'flex flex-col'
            : isOpen
              ? 'columns-2 gap-x-8 sm:columns-3 lg:columns-4'
              : 'grid gap-x-8 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2'
        }
      >
        {shown.map((area) => (
          <li key={area.name} className="min-w-0 break-inside-avoid">
            <AreaLink area={area} />
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={listId}
          className="label w-fit cursor-pointer py-1 underline underline-offset-4 hover:text-warn"
        >
          {isOpen ? 'Show fewer' : `All ${region.areas.length} areas`}
        </button>
      )}
    </div>
  );
}

function AreaLink({ area }: { area: TileArea }) {
  return (
    <Link href={area.href} className="group flex items-baseline justify-between gap-3 py-1 text-[14px]">
      <span className="truncate underline decoration-hair underline-offset-4 transition-colors group-hover:decoration-ink">
        {area.name}
      </span>
      <span className="tabular font-mono text-[11px] text-muted">{area.listings.toLocaleString('en-IN')}</span>
    </Link>
  );
}
