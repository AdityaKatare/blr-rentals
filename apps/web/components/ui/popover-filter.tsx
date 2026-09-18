'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';
import { Caret } from './select';

interface PopoverFilterProps {
  label: string;
  summary?: string | null;
  note?: string;
  width?: string;
  children: ReactNode;
}

export function PopoverFilter({ label, summary = null, note, width = 'lg:w-80', children }: PopoverFilterProps) {
  const panelId = `${useId()}-panel`;
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div ref={wrap} className="lg:relative">
      <span className="label mb-1 block lg:hidden">{label}</span>

      <Button
        ref={trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        variant={summary ? 'solid' : 'outline'}
        className="relative hidden pr-6 lg:inline-flex"
      >
        {label}
        {summary && <span className="font-mono text-[11px]">{summary}</span>}
        <Caret />
      </Button>

      <div
        ref={panel}
        id={panelId}
        role="group"
        aria-label={label}
        className={`${open ? 'block' : 'hidden max-lg:block'} lg:absolute lg:left-0 lg:top-[calc(100%+6px)] lg:z-30 ${width} lg:border lg:border-ink lg:bg-sheet lg:p-4 lg:shadow-sheet`}
      >
        {children}
        {note && <p className="mt-2 border-t border-hair pt-2 text-[12px] leading-snug text-muted">{note}</p>}
        <div className="mt-3 hidden justify-end border-t border-hair pt-3 lg:flex">
          <Button variant="solid" size="sm" onClick={dismiss}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
