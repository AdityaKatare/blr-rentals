'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { useAutoApplyForm } from '@/hooks/use-auto-apply-form';
import { useModalSheet } from '@/hooks/use-modal-sheet';

interface SearchShellProps {
  fields: ReactNode;
  activeCount: number;
  total: number | null;
  children: ReactNode;
}

export function SearchShell({ fields, activeCount, total, children }: SearchShellProps) {
  const { formKey, pending, apply, formHandlers } = useAutoApplyForm();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useModalSheet(open, close);

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
        {...formHandlers}
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
          close();
        }}
        className={`${open ? 'fixed inset-0 z-40 flex flex-col' : 'hidden'} bg-white lg:static lg:flex lg:h-fit lg:flex-col lg:rounded-xl lg:border lg:border-zinc-200 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)]`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 lg:hidden">
          <span className="font-semibold">Filters</span>
          <button type="button" onClick={close} className="rounded-md px-2 py-1 text-sm text-zinc-600">
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
