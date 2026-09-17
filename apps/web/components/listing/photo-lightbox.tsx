'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { CloseIcon } from '@/components/ui/close-icon';
import { useModalSheet } from '@/hooks/use-modal-sheet';

const SWIPE_THRESHOLD_PX = 50;
const FOCUSABLE = 'a[href], button:not([disabled])';

interface PhotoLightboxProps {
  images: string[];
  startIndex: number;
  total: number;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  onClose: (index: number) => void;
}

export function PhotoLightbox({ images, startIndex, total, title, sourceUrl, sourceLabel, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const activeThumb = useRef<HTMLButtonElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swiped = useRef(false);
  const last = images.length - 1;
  const more = total - images.length;

  const close = useCallback(() => onClose(index), [onClose, index]);
  const go = useCallback((delta: number) => setIndex((i) => Math.min(last, Math.max(0, i + delta))), [last]);

  useModalSheet(true, close);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    return () => opener?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') keepFocusInside(e, dialog.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  useEffect(() => {
    activeThumb.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
    for (const neighbour of [images[index - 1], images[index + 1]]) {
      if (neighbour) new Image().src = neighbour;
    }
  }, [images, index]);

  const closeOnBackdrop = (e: MouseEvent<HTMLElement>) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (e.target === e.currentTarget) close();
  };

  const startSwipe = (e: PointerEvent<HTMLElement>) => {
    swipeStartX.current = e.clientX;
    swiped.current = false;
  };

  const endSwipe = (e: PointerEvent<HTMLElement>) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    swiped.current = true;
    go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${title}`}
      onClick={closeOnBackdrop}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="min-w-0 truncate text-sm">{title}</p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-white/70">
            {index + 1} / {images.length}
          </span>
          <button
            ref={closeButton}
            type="button"
            aria-label="Close photos"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        onClick={closeOnBackdrop}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={() => (swipeStartX.current = null)}
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 sm:px-16"
      >
        <img
          key={images[index]}
          src={images[index]}
          alt={`Photo ${index + 1} of ${images.length}`}
          referrerPolicy="no-referrer"
          draggable={false}
          className="max-h-full max-w-full select-none rounded object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:invisible sm:left-4"
            >
              <ChevronIcon direction="left" className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(1)}
              disabled={index === last}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:invisible sm:right-4"
            >
              <ChevronIcon direction="right" className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div onClick={closeOnBackdrop} className="flex flex-col items-center gap-2 px-4 py-3">
        {images.length > 1 && (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {images.map((src, i) => (
              <button
                key={src}
                ref={i === index ? activeThumb : undefined}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded border-2 ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {more > 0 && (
          <p className="text-xs text-white/70">
            {more} more {more === 1 ? 'photo' : 'photos'} on{' '}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
              {sourceLabel} ↗
            </a>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function keepFocusInside(e: KeyboardEvent, container: HTMLElement | null): void {
  if (!container) return;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];
  if (!first || !lastFocusable) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    lastFocusable.focus();
  } else if (!e.shiftKey && document.activeElement === lastFocusable) {
    e.preventDefault();
    first.focus();
  }
}
