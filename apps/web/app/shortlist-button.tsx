'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { parseShortlist, serializeShortlist, SHORTLIST_COOKIE, toggleShortlist } from '@/lib/shortlist';

const readCookie = (): string | undefined =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${SHORTLIST_COOKIE}=`))
    ?.slice(SHORTLIST_COOKIE.length + 1);

export function ShortlistButton({ id, saved: initiallySaved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [, startTransition] = useTransition();

  function toggle() {
    const ids = toggleShortlist(parseShortlist(readCookie()), id);
    document.cookie = `${SHORTLIST_COOKIE}=${serializeShortlist(ids)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setSaved(ids.includes(id.toLowerCase()));
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
      title={saved ? 'Remove from shortlist' : 'Add to shortlist'}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${saved ? 'fill-rose-600 stroke-rose-600' : 'fill-none stroke-zinc-700'}`} strokeWidth={2}>
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}
