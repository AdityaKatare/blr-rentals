'use client';

import dynamic from 'next/dynamic';
import type { ResultsMapProps } from './results-map-leaflet';

const ResultsMapLeaflet = dynamic(() => import('./results-map-leaflet').then((m) => m.ResultsMapLeaflet), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="label flex h-full min-h-56 items-center justify-center bg-shade">Loading map</div>
  );
}

export function ResultsMap(props: ResultsMapProps) {
  return <ResultsMapLeaflet {...props} />;
}
