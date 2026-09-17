'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { PhotoLightbox } from './photo-lightbox';

interface PhotoCarouselProps {
  images: string[];
  total: number;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
}

export function PhotoCarousel({ images, total, title, sourceUrl, sourceLabel }: PhotoCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback((lastViewed: number) => {
    setLightboxIndex(null);
    const el = track.current;
    if (el) el.scrollTo({ left: lastViewed * el.clientWidth });
  }, []);

  if (images.length === 0) {
    return <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">No photo</div>;
  }

  const go = (delta: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: delta * el.clientWidth, behavior: 'smooth' });
  };

  const more = total - images.length;

  return (
    <div className="group/photos absolute inset-0">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`View photo ${i + 1} of ${images.length} larger`}
            onClick={() => setLightboxIndex(i)}
            className="h-full w-full shrink-0 snap-center cursor-zoom-in"
          >
            <img
              src={src}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow disabled:opacity-0 group-hover/photos:flex"
          >
            <ChevronIcon direction="left" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            disabled={index >= images.length - 1}
            className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow disabled:opacity-0 group-hover/photos:flex"
          >
            <ChevronIcon direction="right" className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            {Math.min(index + 1, images.length)} / {images.length}
            {more > 0 && index === images.length - 1 ? ` · ${more} more on site` : ''}
          </span>
        </>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={images}
          startIndex={lightboxIndex}
          total={total}
          title={title}
          sourceUrl={sourceUrl}
          sourceLabel={sourceLabel}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
