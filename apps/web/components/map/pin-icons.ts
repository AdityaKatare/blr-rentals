import * as L from 'leaflet';
import type { MapPin } from '@/utils/map';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const PILL =
  'absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none tabular-nums transition';
const EXACT = 'border-ink bg-ink text-paper';
const APPROXIMATE = 'border-dashed border-ink bg-paper text-ink';
const ACTIVE =
  'group-data-[active]:-translate-y-[calc(50%+3px)] group-data-[active]:border-solid group-data-[active]:border-ink group-data-[active]:bg-paper group-data-[active]:text-ink group-data-[active]:shadow-[2px_2px_0_#141414]';

export function rentPin(label: string, accuracy: MapPin['accuracy']): L.DivIcon {
  return L.divIcon({
    className: 'blr-pin group',
    html: `<span class="${PILL} ${accuracy === 'exact' ? EXACT : APPROXIMATE} ${ACTIVE}">${escapeHtml(label)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function centerPin(): L.DivIcon {
  return L.divIcon({
    className: 'blr-center-pin',
    html: '<span class="block h-4 w-4 rounded-full border-[3px] border-paper bg-alert ring-1 ring-ink/40"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function localityDot(name: string): L.DivIcon {
  return L.divIcon({
    className: 'blr-locality',
    html: `<span class="block h-2 w-2 rounded-full bg-muted ring-1 ring-paper"></span><span class="blr-locality-label absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] text-second [text-shadow:0_0_2px_#f5f4f0,0_0_2px_#f5f4f0,0_0_3px_#f5f4f0]">${escapeHtml(name)}</span>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}
