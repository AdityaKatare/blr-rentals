'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GUTTER, PAGE_WIDTH } from '@/components/layout/page';
import { Button, buttonClass } from '@/components/ui/button';
import { useAutoApplyForm } from '@/hooks/use-auto-apply-form';
import { useModalSheet } from '@/hooks/use-modal-sheet';

interface SearchShellProps {
  headline: ReactNode;
  fields: ReactNode;
  activeCount: number;
  total: number | null;
  children: ReactNode;
}

export function SearchShell({ headline, fields, activeCount, total, children }: SearchShellProps) {
  const { formKey, pending, apply, formHandlers } = useAutoApplyForm();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useModalSheet(open, close);

  const opened = useRef(false);
  useEffect(() => {
    if (open) {
      opened.current = true;
      closeButton.current?.focus();
    } else if (opened.current) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const countLabel = total === null ? 'Results' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'rental' : 'rentals'}`;
  const resultsLabel = total === null ? 'Show results' : `Show ${countLabel}`;

  return (
    <>
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
      >
        <div className={`${PAGE_WIDTH} ${GUTTER} py-5 lg:py-7`}>{headline}</div>

        <div className="sticky top-0 z-20 border-y border-ink bg-paper lg:hidden">
          <div className={`${GUTTER} flex items-center gap-3 py-2`}>
            <Button ref={trigger} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filter-band">
              Filters
              {activeCount > 0 && <span className="font-mono text-[11px]">{activeCount}</span>}
            </Button>
            <span className="label" aria-live="polite">
              {pending ? 'Updating…' : countLabel}
            </span>
          </div>
        </div>

        <div
          id="filter-band"
          className={
            open
              ? 'fixed inset-0 z-40 flex flex-col bg-paper'
              : 'hidden lg:block lg:border-y-2 lg:border-ink'
          }
        >
          <div className="flex items-center justify-between border-b border-ink px-4 py-3 lg:hidden">
            <span className="font-display text-[22px] leading-none">Filters</span>
            <button
              ref={closeButton}
              type="button"
              onClick={close}
              className="label underline underline-offset-4 hover:text-warn"
            >
              Close
            </button>
          </div>

          <div
            className={`${PAGE_WIDTH} ${GUTTER} flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain py-5 lg:gap-3 lg:overflow-visible lg:py-3`}
          >
            {fields}
          </div>

          <div className="flex items-center gap-2 border-t border-ink px-4 py-3 lg:hidden">
            <button type="submit" className={buttonClass('solid', 'md', 'flex-1')}>
              {pending ? 'Updating…' : resultsLabel}
            </button>
          </div>
        </div>
      </form>

      <section aria-busy={pending} className={`transition-opacity duration-150 ${pending ? 'opacity-60' : ''}`}>
        {children}
      </section>
    </>
  );
}
