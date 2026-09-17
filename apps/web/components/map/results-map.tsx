'use client';

import dynamic from 'next/dynamic';
import type { ResultsMapProps } from './results-map-leaflet';

const ResultsMapLeaflet = dynamic(() => import('./results-map-leaflet').then((m) => m.ResultsMapLeaflet), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-xs text-zinc-500 sm:h-64">
      Loading map…
    </div>
  );
}

export function ResultsMap(props: ResultsMapProps) {
  return <ResultsMapLeaflet {...props} />;
}
