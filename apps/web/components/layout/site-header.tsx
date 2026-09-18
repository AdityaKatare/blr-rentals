import Link from 'next/link';
import { HeartIcon } from '@/components/ui/heart-icon';

export function SiteHeader({ savedCount }: { savedCount: number }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          blr-rentals
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600">
          <Link href="/shortlist" className="flex items-center gap-1 hover:text-zinc-900">
            <HeartIcon className="h-4 w-4 fill-rose-600" />
            Shortlist
            {savedCount > 0 && <span className="rounded-full bg-zinc-900 px-1.5 text-xs text-white">{savedCount}</span>}
          </Link>
          <Link href="/societies" className="hover:text-zinc-900">
            Apartments
          </Link>
          <Link href="/status" className="hover:text-zinc-900">
            Status
          </Link>
        </nav>
      </div>
    </header>
  );
}
