import type { ReactNode } from 'react';

export const GUTTER = 'px-4 sm:px-6 lg:px-10';
export const PAGE_WIDTH = 'mx-auto w-full max-w-[1600px]';

interface PageShellProps {
  width?: 'full' | 'reading';
  children: ReactNode;
}

export function PageShell({ width = 'full', children }: PageShellProps) {
  const cap = width === 'reading' ? 'max-w-4xl' : 'max-w-[1600px]';
  return <div className={`mx-auto w-full ${cap} ${GUTTER} py-6 lg:py-8`}>{children}</div>;
}

interface PageHeadlineProps {
  title: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}

export function PageHeadline({ title, aside, children }: PageHeadlineProps) {
  return (
    <div className="border-b-2 border-ink pb-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="font-display text-[26px] leading-[1.1] sm:text-[32px]">{title}</h1>
        {aside}
      </div>
      {children}
    </div>
  );
}
