import type { ReactNode } from 'react';

interface NoticeProps {
  tone: 'alert' | 'plain';
  title: string;
  children?: ReactNode;
}

export function Notice({ tone, title, children }: NoticeProps) {
  const frame = tone === 'alert' ? 'border-l-4 border-ink' : 'border-l-4 border-hair';
  return (
    <div className={`border-y border-r border-hair bg-sheet p-4 text-sm sm:p-5 ${frame}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-second">{children}</div>}
    </div>
  );
}

export function DatabaseErrorNotice({ message }: { message: string }) {
  return (
    <Notice tone="alert" title="Database unreachable">
      <p>{message}</p>
      <p className="mt-2">
        Start it with <code className="font-mono">pnpm db:up</code>, then{' '}
        <code className="font-mono">pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
      </p>
    </Notice>
  );
}
