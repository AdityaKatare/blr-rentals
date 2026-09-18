'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useModalSheet } from '@/hooks/use-modal-sheet';
import { keepFocusInside, scrollToListing } from '@/utils/focus';
import { ResultsMap } from './results-map';
import type { ResultsMapProps } from './results-map-leaflet';

type MapData = Omit<ResultsMapProps, 'onPick'>;

export function MapDialog({ map }: { map: MapData }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const pins = `${map.pins.length} ${map.pins.length === 1 ? 'pin' : 'pins'}`;

  return (
    <>
      <Button ref={trigger} size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        Map
        <span className="tabular font-mono text-[11px] text-muted">{pins}</span>
      </Button>
      {open && <MapDialogPanel map={map} onClose={close} returnTo={trigger} />}
    </>
  );
}

interface MapDialogPanelProps {
  map: MapData;
  onClose: () => void;
  returnTo: RefObject<HTMLButtonElement | null>;
}

function MapDialogPanel({ map, onClose, returnTo }: MapDialogPanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const picked = useRef<string | null>(null);

  useModalSheet(true, onClose);

  useEffect(() => {
    closeButton.current?.focus();
    return () => {
      const id = picked.current;
      returnTo.current?.focus({ preventScroll: true });
      if (id) requestAnimationFrame(() => scrollToListing(id));
    };
  }, [returnTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') keepFocusInside(e, panel.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = useCallback(
    (id: string) => {
      picked.current = id;
      onClose();
    },
    [onClose],
  );

  const closeOnBackdrop = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div onClick={closeOnBackdrop} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 sm:p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Map of rentals within ${map.radiusKm} km of ${map.near}`}
        className="flex h-full w-full flex-col border-ink bg-paper sm:h-[min(86dvh,780px)] sm:w-[min(96vw,1100px)] sm:border sm:shadow-sheet"
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink px-4 py-3">
          <h2 className="font-display text-[22px] leading-none">Map</h2>
          <p className="label hidden sm:block">Click a pin to jump to its row</p>
          <Button ref={closeButton} size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          <ResultsMap {...map} onPick={pick} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
