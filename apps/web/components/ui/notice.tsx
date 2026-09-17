import type { ReactNode } from 'react';

interface NoticeProps {
  tone: 'amber' | 'zinc';
  title: string;
  children?: ReactNode;
}

export function Notice({ tone, title, children }: NoticeProps) {
  const styles = tone === 'amber' ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white';
  return (
    <div className={`rounded-xl border p-5 text-sm ${styles}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-zinc-600">{children}</div>}
    </div>
  );
}

export function DatabaseErrorNotice({ message }: { message: string }) {
  return (
    <Notice tone="amber" title="Database unreachable">
      <p>{message}</p>
      <p className="mt-2">
        Start it with <code>pnpm db:up</code>, then <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
      </p>
    </Notice>
  );
}
