'use client';

import type { ReactNode } from 'react';
import { useActiveListing } from '@/components/search/active-listing';

interface ListingRowFrameProps {
  id: string;
  dimmed: boolean;
  children: ReactNode;
}

const GRID =
  'grid gap-x-5 gap-y-3 @md:grid-cols-[160px_minmax(0,1fr)] @3xl:grid-cols-[160px_150px_minmax(0,1fr)_132px] @5xl:grid-cols-[176px_168px_minmax(0,1fr)_150px] @5xl:gap-x-6';

export function ListingRowFrame({ id, dimmed, children }: ListingRowFrameProps) {
  const { activeId, setActive } = useActiveListing();
  const active = activeId === id;

  return (
    <article
      id={`listing-${id}`}
      onMouseEnter={() => setActive(id)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(id)}
      onBlur={() => setActive(null)}
      className={`group -ml-3 border-b border-l-2 border-b-ink py-5 pl-3 transition-colors ${GRID} ${
        dimmed ? 'opacity-60' : ''
      } ${active ? 'border-l-ink bg-sheet/60' : 'border-l-transparent'}`}
    >
      {children}
    </article>
  );
}
