'use client';

import { useState, type ReactNode } from 'react';

export function MapPanel({ children, note }: { children: ReactNode; note?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="order-1 border-b border-ink lg:sticky lg:top-0 lg:order-2 lg:h-dvh lg:self-start lg:border-b-0 lg:border-l-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="results-map"
        className="label flex min-h-11 w-full items-center justify-between hover:text-warn lg:hidden"
      >
        {open ? 'Hide map' : 'Show map'}
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>

      <div id="results-map" className={`${open ? 'block' : 'hidden'} h-[45dvh] pb-4 lg:flex lg:h-full lg:flex-col lg:pb-0`}>
        <div className="min-h-0 flex-1">{children}</div>
        {note && (
          <p className="hidden border-t border-ink px-4 py-2 text-[12px] leading-snug text-second lg:block">{note}</p>
        )}
      </div>
    </aside>
  );
}
