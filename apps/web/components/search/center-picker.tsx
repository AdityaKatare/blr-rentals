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
        className="font-mono text-[11px] uppercase tracking-[0.08em] underline underline-offset-4 hover:text-warn disabled:no-underline disabled:opacity-50"
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
    <div className="flex items-center gap-2 font-mono text-[11px] text-second">
      <span className="tabular inline-flex items-center border border-rule bg-sheet px-2 py-1">
        {formatCoord(point.lat)}, {formatCoord(point.lng)}
      </span>
      <button ref={button} type="button" onClick={clear} className="uppercase tracking-[0.08em] underline underline-offset-4 hover:text-warn">
        Clear
      </button>
    </div>
  );
}
