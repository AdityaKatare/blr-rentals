'use client';

import * as L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useActiveListing } from '@/components/search/active-listing';
import { RESULTS_MAX_ZOOM, RESULTS_ZOOM } from '@/constants/map';
import { useLeafletMap } from '@/hooks/use-leaflet-map';
import { prefersReducedMotion } from '@/utils/focus';
import type { LatLng, MapPin } from '@/utils/map';
import { centerPin, rentPin } from './pin-icons';

export interface ResultsMapProps {
  center: LatLng;
  radiusKm: number;
  pins: MapPin[];
  approxOnly: number;
  page: number;
  pages: number;
  total: number;
  near: string;
}

const AREA_STYLE: L.CircleMarkerOptions = { color: '#18181b', weight: 1, opacity: 0.5, fillColor: '#18181b', fillOpacity: 0.05, interactive: false };

function scrollToCard(id: string): void {
  document.getElementById(`listing-${id}`)?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function markActive(marker: L.Marker, active: boolean): void {
  marker.getElement()?.toggleAttribute('data-active', active);
  marker.setZIndexOffset(active ? 1000 : 0);
}

export function ResultsMapLeaflet({ center, radiusKm, pins, approxOnly, page, pages, total, near }: ResultsMapProps) {
  const { ref, map } = useLeafletMap({ center, zoom: RESULTS_ZOOM });
  const { activeId, setActive } = useActiveListing();
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const area = useRef<{ circle: L.Circle; marker: L.Marker } | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!map) {
      area.current = null;
      return;
    }
    const position: L.LatLngTuple = [center.lat, center.lng];
    if (area.current) {
      area.current.circle.setLatLng(position).setRadius(radiusKm * 1000);
      area.current.marker.setLatLng(position);
    } else {
      area.current = {
        circle: L.circle(position, { ...AREA_STYLE, radius: radiusKm * 1000 }).addTo(map),
        marker: L.marker(position, { icon: centerPin(), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(map),
      };
    }
    map.fitBounds(area.current.circle.getBounds(), { padding: [12, 12], maxZoom: RESULTS_MAX_ZOOM, animate: !prefersReducedMotion() });
  }, [map, center.lat, center.lng, radiusKm]);

  useEffect(() => {
    if (!map) {
      pinLayer.current = null;
      markers.current.clear();
      return;
    }
    const layer = pinLayer.current ?? L.layerGroup().addTo(map);
    pinLayer.current = layer;
    layer.clearLayers();
    markers.current.clear();

    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: rentPin(pin.label, pin.accuracy), keyboard: true, title: pin.title }).addTo(layer);
      const select = () => {
        setActive(pin.id);
        scrollToCard(pin.id);
      };
      marker.on('mouseover', () => setActive(pin.id));
      marker.on('mouseout', () => setActive(null));
      marker.on('click', select);
      const el = marker.getElement();
      if (el) {
        el.setAttribute('aria-label', pin.title);
        el.addEventListener('focus', () => setActive(pin.id));
        el.addEventListener('blur', () => setActive(null));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            select();
          }
        });
      }
      markActive(marker, pin.id === activeRef.current);
      markers.current.set(pin.id, marker);
    }
  }, [map, pins, setActive]);

  useEffect(() => {
    for (const [id, marker] of markers.current) markActive(marker, id === activeId);
  }, [activeId]);

  const count = `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'}`;
  const caption = pages > 1 ? `Pins: page ${page} of ${pages} · ${pins.length} of ${total}` : count;

  return (
    <div
      role="region"
      aria-label={`Map of rentals within ${radiusKm} km of ${near}`}
      className="relative isolate h-56 overflow-hidden rounded-xl border border-zinc-200 sm:h-64"
    >
      <div ref={ref} className="blr-map absolute inset-0" />
      <div className="pointer-events-none absolute bottom-1 left-1 z-[1001] flex flex-col items-start gap-0.5 text-[11px] text-zinc-700">
        <span className="rounded bg-white/85 px-1.5 py-0.5">{caption}</span>
        {approxOnly > 0 && (
          <span className="rounded bg-white/85 px-1.5 py-0.5">
            +{approxOnly} located to locality only, not pinned
          </span>
        )}
      </div>
    </div>
  );
}
