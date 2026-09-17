'use client';

import type { ReactNode } from 'react';
import { useActiveListing } from '@/components/search/active-listing';

interface ListingCardFrameProps {
  id: string;
  dimmed: boolean;
  children: ReactNode;
}

export function ListingCardFrame({ id, dimmed, children }: ListingCardFrameProps) {
  const { activeId, setActive } = useActiveListing();
  const active = activeId === id;

  return (
    <article
      id={`listing-${id}`}
      onMouseEnter={() => setActive(id)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(id)}
      onBlur={() => setActive(null)}
      className={`group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row ${dimmed ? 'opacity-70' : ''} ${active ? 'ring-2 ring-zinc-900' : ''}`}
    >
      {children}
    </article>
  );
}
