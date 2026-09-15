import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { parseShortlist, SHORTLIST_COOKIE } from '@/lib/shortlist';
import './globals.css';

export const metadata: Metadata = {
  title: 'blr-rentals',
  description: 'One search over Bangalore rental listings from several portals.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const saved = parseShortlist((await cookies()).get(SHORTLIST_COOKIE)?.value).length;

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              blr-rentals
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600">
              <Link href="/shortlist" className="flex items-center gap-1 hover:text-zinc-900">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-rose-600" aria-hidden>
                  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
                </svg>
                Shortlist
                {saved > 0 && <span className="rounded-full bg-zinc-900 px-1.5 text-xs text-white">{saved}</span>}
              </Link>
              <Link href="/status" className="hover:text-zinc-900">
                Status
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
