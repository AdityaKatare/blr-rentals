'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GUTTER, PAGE_WIDTH } from '@/components/layout/page';
import { Button, buttonClass } from '@/components/ui/button';
import { useAutoApplyForm } from '@/hooks/use-auto-apply-form';
import { useModalSheet } from '@/hooks/use-modal-sheet';

interface SearchShellProps {
  headline: ReactNode;
  fields: ReactNode;
  sort: ReactNode;
  activeCount: number;
  total: number | null;
  landing: boolean;
  children: ReactNode;
}

export function SearchShell({ headline, fields, sort, activeCount, total, landing, children }: SearchShellProps) {
  const { formKey, pending, apply, formHandlers } = useAutoApplyForm();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(activeCount > 0);
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
  const badge = activeCount > 0 ? <span className="font-mono text-[11px]">{activeCount}</span> : null;

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
        <div className={`${PAGE_WIDTH} ${GUTTER} py-5 lg:py-6`}>{headline}</div>

        <div className={landing ? 'hidden' : 'sticky top-0 z-20 border-y border-ink bg-paper'}>
          <div className={`${PAGE_WIDTH} ${GUTTER} flex items-center gap-3 py-1.5`}>
            <span className="lg:hidden">
              <Button
                ref={trigger}
                size="sm"
                variant={activeCount > 0 ? 'solid' : 'outline'}
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls="filter-band"
              >
                Filters
                {badge}
              </Button>
            </span>
            <span className="hidden lg:block">
              <Button
                size="sm"
                variant={activeCount > 0 ? 'solid' : 'outline'}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="filter-band"
              >
                {expanded ? 'Hide filters' : 'More filters'}
                {badge}
                <span aria-hidden className="text-[9px] leading-none">
                  {expanded ? '▴' : '▾'}
                </span>
              </Button>
            </span>
            <span className="label" aria-live="polite">
              {pending ? 'Updating…' : countLabel}
            </span>
            <span className="label ml-auto hidden xl:inline">Applies as you change</span>
            <div className="ml-auto xl:ml-0">{sort}</div>
          </div>
        </div>

        <div
          id="filter-band"
          className={
            landing
              ? 'hidden'
              : open
              ? 'fixed inset-0 z-40 flex flex-col bg-paper'
              : expanded
                ? 'hidden lg:block lg:border-b-2 lg:border-ink'
                : 'hidden'
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
            className={`${PAGE_WIDTH} ${GUTTER} flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain py-5 lg:gap-2.5 lg:overflow-visible lg:py-2.5`}
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
