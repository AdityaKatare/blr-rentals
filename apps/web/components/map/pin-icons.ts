import * as L from 'leaflet';
import type { MapPin } from '@/utils/map';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const PILL = 'absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none transition';
const EXACT = 'bg-zinc-800 text-white shadow';
const APPROXIMATE = 'border border-dashed border-zinc-500 bg-white/90 text-zinc-700';
const ACTIVE = 'group-data-[active]:-translate-y-[calc(50%+2px)] group-data-[active]:bg-zinc-950 group-data-[active]:text-white group-data-[active]:border-solid group-data-[active]:border-zinc-950 group-data-[active]:shadow-lg group-data-[active]:ring-2 group-data-[active]:ring-white';

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
    html: '<span class="block h-4 w-4 rounded-full border-[3px] border-white bg-rose-600 shadow-md ring-1 ring-zinc-900/30"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function localityDot(name: string): L.DivIcon {
  return L.divIcon({
    className: 'blr-locality',
    html: `<span class="block h-2 w-2 rounded-full bg-zinc-500 ring-1 ring-white"></span><span class="blr-locality-label absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] text-zinc-700 [text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_3px_#fff]">${escapeHtml(name)}</span>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}
