'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';

const TYPING_DELAY_MS = 600;
const TYPED_INPUTS = new Set(['text', 'number', 'search']);

interface Props {
  fields: ReactNode;
  activeCount: number;
  total: number | null;
  children: ReactNode;
}

export function SearchShell({ fields, activeCount, total, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(qs);
  const lastApplied = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (qs !== lastApplied.current) setFormKey(qs);
  }, [qs]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply(form: HTMLFormElement) {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim() !== '') params.append(key, value.trim());
    }
    const next = params.toString();
    if (next === qs) return;
    lastApplied.current = next;
    startTransition(() => router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  function onInput(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (target instanceof HTMLInputElement && target.name === 'locality') {
      const inputType = (e.nativeEvent as InputEvent).inputType;
      if (inputType === undefined || inputType === 'insertReplacementText') apply(form);
      return;
    }
    if (target instanceof HTMLInputElement && TYPED_INPUTS.has(target.type)) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => apply(form), TYPING_DELAY_MS);
      return;
    }
    apply(form);
  }

  const resultsLabel = total === null ? 'Show results' : `Show ${total.toLocaleString('en-IN')} ${total === 1 ? 'rental' : 'rentals'}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium"
          aria-expanded={open}
          aria-controls="filters"
        >
          Filters
          {activeCount > 0 && <span className="rounded-full bg-zinc-900 px-1.5 text-xs text-white">{activeCount}</span>}
        </button>
        {pending && <span className="text-xs text-zinc-500">Updating…</span>}
      </div>

      <form
        id="filters"
        key={formKey}
        method="get"
        onInput={onInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'checkbox') {
            e.preventDefault();
            apply(e.currentTarget);
          }
        }}
        onBlur={(e) => {
          const t = e.target as HTMLElement;
          if (t instanceof HTMLInputElement && t.name === 'locality') apply(e.currentTarget);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
          setOpen(false);
        }}
        className={`${open ? 'fixed inset-0 z-40 flex flex-col' : 'hidden'} bg-white lg:static lg:flex lg:h-fit lg:flex-col lg:rounded-xl lg:border lg:border-zinc-200 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)]`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 lg:hidden">
          <span className="font-semibold">Filters</span>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm text-zinc-600">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">{fields}</div>

        <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3">
          <button
            type="submit"
            className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 lg:hidden"
          >
            {pending ? 'Updating…' : resultsLabel}
          </button>
          <span className="hidden flex-1 text-xs text-zinc-500 lg:block" aria-live="polite">
            {pending ? 'Updating…' : 'Filters apply as you change them'}
          </span>
          <a href="/" className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
            Reset
          </a>
        </div>
      </form>

      <section aria-busy={pending} className={`min-w-0 space-y-4 transition-opacity ${pending ? 'opacity-60' : ''}`}>
        {children}
      </section>
    </div>
  );
}
