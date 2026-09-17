'use client';

import type { LocalityMatch } from '@blr/db';
import * as L from 'leaflet';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { centerPin, localityDot } from '@/components/map/pin-icons';
import { BENGALURU_BOUNDS, LOCALITY_LABEL_MIN_ZOOM, PICKER_MIN_ZOOM, PICKER_ZOOM } from '@/constants/map';
import { useLeafletMap } from '@/hooks/use-leaflet-map';
import { useModalSheet } from '@/hooks/use-modal-sheet';
import { keepFocusInside } from '@/utils/focus';
import { formatCoord } from '@/utils/map';

export type CenterSelection =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'locality'; name: string; lat: number; lng: number };

interface CenterPickerDialogProps {
  localities: LocalityMatch[];
  initial: CenterSelection;
  radiusKm: number;
  onCancel: () => void;
  onConfirm: (selection: CenterSelection) => void;
}

const AREA_STYLE: L.CircleMarkerOptions = { color: '#e11d48', weight: 1, opacity: 0.6, fillColor: '#e11d48', fillOpacity: 0.06, interactive: false };

export function CenterPickerDialog({ localities, initial, radiusKm, onCancel, onConfirm }: CenterPickerDialogProps) {
  const [selection, setSelection] = useState<CenterSelection>(initial);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const dialog = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const pin = useRef<{ marker: L.Marker; circle: L.Circle } | null>(null);
  const { ref, map } = useLeafletMap({
    center: initial,
    zoom: PICKER_ZOOM,
    maxBounds: BENGALURU_BOUNDS,
    scrollWheelZoom: true,
    minZoom: PICKER_MIN_ZOOM,
  });

  useModalSheet(true, onCancel);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButton.current?.focus();
    return () => opener?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') keepFocusInside(e, dialog.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!map) {
      pin.current = null;
      return;
    }
    const container = map.getContainer();
    const syncLabels = () => {
      container.dataset.labels = map.getZoom() >= LOCALITY_LABEL_MIN_ZOOM ? 'on' : 'off';
    };
    syncLabels();
    map.on('zoomend', syncLabels);

    const dots = L.layerGroup().addTo(map);
    for (const l of localities) {
      L.marker([l.lat, l.lng], { icon: localityDot(l.name), keyboard: false, title: l.name, zIndexOffset: -500 })
        .on('click', () => setSelection({ kind: 'locality', name: l.name, lat: l.lat, lng: l.lng }))
        .addTo(dots);
    }

    const start: L.LatLngTuple = [selectionRef.current.lat, selectionRef.current.lng];
    const circle = L.circle(start, { ...AREA_STYLE, radius: radiusKm * 1000 }).addTo(map);
    const marker = L.marker(start, { icon: centerPin(), draggable: true, keyboard: false, zIndexOffset: 1000, title: 'Search centre' }).addTo(map);
    marker.on('drag', () => circle.setLatLng(marker.getLatLng()));
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setSelection({ kind: 'point', lat, lng });
    });
    const onMapClick = (e: L.LeafletMouseEvent) => setSelection({ kind: 'point', lat: e.latlng.lat, lng: e.latlng.lng });
    map.on('click', onMapClick);
    pin.current = { marker, circle };

    return () => {
      map.off('zoomend', syncLabels);
      map.off('click', onMapClick);
      dots.remove();
      circle.remove();
      marker.remove();
      pin.current = null;
    };
  }, [map, localities, radiusKm]);

  useEffect(() => {
    if (!pin.current) return;
    const position: L.LatLngTuple = [selection.lat, selection.lng];
    pin.current.marker.setLatLng(position);
    pin.current.circle.setLatLng(position);
  }, [selection, map]);

  const closeOnBackdrop = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const summary =
    selection.kind === 'locality' ? `${selection.name} (locality centre)` : `${formatCoord(selection.lat)}, ${formatCoord(selection.lng)}`;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="center-picker-title"
      onClick={closeOnBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4"
    >
      <div className="flex h-full w-full flex-col bg-white sm:h-[560px] sm:max-h-full sm:w-[640px] sm:max-w-full sm:rounded-xl sm:shadow-xl">
        <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 id="center-picker-title" className="font-semibold">
            Pick a search centre
          </h2>
          <p className="text-xs text-zinc-500">Tap the map or a locality, or drag the pin</p>
        </div>

        <div className="relative isolate min-h-0 flex-1 overflow-hidden">
          <div ref={ref} className="blr-map absolute inset-0" />
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm" aria-live="polite">
            {summary}
            <span className="text-zinc-500"> · {radiusKm} km radius</span>
          </p>
          <button
            ref={cancelButton}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selection)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Use this point
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
