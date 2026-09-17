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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105"
    >
      <HeartIcon className={`h-5 w-5 ${saved ? 'fill-rose-600 stroke-rose-600' : 'fill-none stroke-zinc-700'}`} strokeWidth={2} />
    </button>
  );
}
