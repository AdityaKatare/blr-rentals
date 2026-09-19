'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

interface RadiusSelectProps {
  name: string;
  label: string;
  value: number;
  options: number[];
}

export function RadiusSelect({ name, label, value, options }: RadiusSelectProps) {
  const listId = `${useId()}-list`;
  const wrap = useRef<HTMLSpanElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(value);
  const [selected, setSelected] = useState(value);
  const [active, setActive] = useState(() => options.indexOf(value));

  if (value !== applied) {
    setApplied(value);
    setSelected(value);
    setActive(options.indexOf(value));
  }

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !wrap.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const choose = (km: number) => {
    setOpen(false);
    setSelected(km);
    setActive(options.indexOf(km));
    trigger.current?.focus();
    const input = field.current;
    if (!input || km === value) return;
    input.value = String(km);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const show = () => {
    setOpen(true);
    setActive(options.indexOf(selected));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        show();
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
      return;
    }
    if (!open) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const picked = options[active];
      if (picked !== undefined) choose(picked);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : options.length - 1);
    }
  };

  return (
    <span
      ref={wrap}
      className="relative inline-flex items-baseline border-b-2 border-ink align-baseline focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
    >
      <input ref={field} type="hidden" name={name} defaultValue={String(value)} />
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className="cursor-pointer bg-transparent pr-[0.7em] font-display text-[inherit] leading-none"
      >
        {selected} km
      </button>
      <span aria-hidden className="pointer-events-none absolute right-0 bottom-[0.25em] text-[0.45em] leading-none">
        ▾
      </span>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 max-h-72 w-max min-w-full overflow-y-auto overscroll-contain border border-ink bg-sheet font-sans text-[13px] leading-normal font-normal tracking-normal text-ink shadow-sheet"
        >
          {options.map((km, i) => (
            <li
              key={km}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={km === selected}
              onMouseEnter={() => setActive(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(km);
              }}
              className={`tabular cursor-pointer px-3 py-2 ${i === active ? 'bg-ink text-paper' : ''}`}
            >
              {km} km
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
