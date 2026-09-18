'use client';

import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, WHEEL_PX_PER_ZOOM_LEVEL } from '@/constants/map';
import { prefersReducedMotion } from '@/utils/focus';
import type { LatLng } from '@/utils/map';

interface LeafletMapOptions {
  center: LatLng;
  zoom: number;
  maxBounds?: L.LatLngBoundsLiteral;
  scrollWheelZoom?: boolean;
  minZoom?: number;
}

export function useLeafletMap(options: LeafletMapOptions): { ref: RefObject<HTMLDivElement | null>; map: L.Map | null } {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const initial = useRef(options);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { center, zoom, maxBounds, scrollWheelZoom = false, minZoom } = initial.current;
    const animate = !prefersReducedMotion();
    const instance = L.map(el, {
      center: [center.lat, center.lng],
      zoom,
      minZoom,
      maxBounds,
      maxBoundsViscosity: maxBounds ? 0.8 : 0,
      scrollWheelZoom,
      zoomAnimation: animate,
      fadeAnimation: animate,
      markerZoomAnimation: animate,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(instance);

    let disposed = false;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!disposed) instance.invalidateSize({ animate: false });
      });
    });
    observer.observe(el);
    setMap(instance);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const el = map.getContainer();

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (map.scrollWheelZoom.enabled()) return;
      const at = map.containerPointToLatLng(map.mouseEventToContainerPoint(e));
      const step = Math.max(-1, Math.min(1, -e.deltaY / WHEEL_PX_PER_ZOOM_LEVEL));
      map.setZoomAround(at, map.getZoom() + step, { animate: false });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [map]);

  return { ref, map };
}
