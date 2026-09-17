'use client';

import type { LocalityMatch } from '@blr/db';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { formatCoord, type LatLng } from '@/utils/map';
import type { CenterSelection } from './center-picker-dialog';

const CenterPickerDialog = dynamic(() => import('./center-picker-dialog').then((m) => m.CenterPickerDialog), { ssr: false });

interface CenterPickerProps {
  localities: LocalityMatch[];
  center: LatLng | null;
  radiusKm: number;
  nearestName: string | null;
  explicit: boolean;
}

function setField(form: HTMLFormElement, name: string, value: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.value = value;
}

function submitCenter(form: HTMLFormElement, locality: string, point: LatLng | null): void {
  setField(form, 'locality', locality);
  setField(form, 'lat', point ? formatCoord(point.lat) : '');
  setField(form, 'lng', point ? formatCoord(point.lng) : '');
  form.requestSubmit();
}

export function CenterPicker({ localities, center, radiusKm, nearestName, explicit }: CenterPickerProps) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const confirm = (selection: CenterSelection) => {
    const form = button.current?.form;
    setOpen(false);
    if (!form) return;
    submitCenter(form, selection.kind === 'locality' ? selection.name : '', selection.kind === 'point' ? selection : null);
  };

  const startLocality = explicit ? null : localities.find((l) => l.name === nearestName) ?? null;
  const start = center ?? localities[0] ?? null;
  const initial: CenterSelection | null = !start
    ? null
    : startLocality
      ? { kind: 'locality', name: startLocality.name, lat: startLocality.lat, lng: startLocality.lng }
      : { kind: 'point', lat: start.lat, lng: start.lng };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        disabled={!initial}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900 disabled:no-underline disabled:opacity-50"
      >
        Pick on map
      </button>
      {open && initial && (
        <CenterPickerDialog
          localities={localities}
          initial={initial}
          radiusKm={radiusKm}
          onCancel={() => setOpen(false)}
          onConfirm={confirm}
        />
      )}
    </>
  );
}

interface MapPinChipProps {
  point: LatLng;
  nearestName: string | null;
}

export function MapPinChip({ point, nearestName }: MapPinChipProps) {
  const button = useRef<HTMLButtonElement>(null);

  const clear = () => {
    const form = button.current?.form;
    if (form) submitCenter(form, nearestName ?? '', null);
  };

  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2 py-0.5">
        Map pin {formatCoord(point.lat)}, {formatCoord(point.lng)}
      </span>
      <button ref={button} type="button" onClick={clear} className="underline underline-offset-2 hover:text-zinc-900">
        Clear
      </button>
    </div>
  );
}
