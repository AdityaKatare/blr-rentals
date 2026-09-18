'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { HeartIcon } from '@/components/ui/heart-icon';
import { SHORTLIST_COOKIE, SHORTLIST_COOKIE_MAX_AGE_SECONDS } from '@/constants/shortlist';
import { readBrowserCookie, writeBrowserCookie } from '@/utils/cookies';
import { parseShortlist, serializeShortlist, toggleShortlist } from '@/utils/shortlist';

export function ShortlistButton({ id, saved: initiallySaved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [, startTransition] = useTransition();

  function toggle() {
    const ids = toggleShortlist(parseShortlist(readBrowserCookie(SHORTLIST_COOKIE)), id);
    writeBrowserCookie(SHORTLIST_COOKIE, serializeShortlist(ids), SHORTLIST_COOKIE_MAX_AGE_SECONDS);
    setSaved(ids.includes(id.toLowerCase()));
    startTransition(() => router.refresh());
  }

  const label = saved ? 'Remove from shortlist' : 'Add to shortlist';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-ink px-3 font-mono text-[11px] tracking-[0.04em] uppercase @3xl:min-h-10 @3xl:flex-none ${
        saved ? 'bg-ink text-paper' : 'bg-sheet text-ink hover:bg-shade'
      }`}
    >
      <HeartIcon className={`h-3.5 w-3.5 ${saved ? 'fill-paper' : 'fill-none stroke-ink'}`} strokeWidth={2} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
