'use client';

import { useEffect, useRef } from 'react';

interface ModalEntry {
  close: () => void;
}

const stack: ModalEntry[] = [];

export function useModalSheet(open: boolean, close: () => void): void {
  const entry = useRef<ModalEntry>({ close });
  entry.current.close = close;

  useEffect(() => {
    if (!open) return;
    const self = entry.current;
    stack.push(self);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === self) self.close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      const index = stack.lastIndexOf(self);
      if (index !== -1) stack.splice(index, 1);
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
}
