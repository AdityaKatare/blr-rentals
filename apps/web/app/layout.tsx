import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { readShortlistIds } from '@/server/shortlist';
import './globals.css';

export const metadata: Metadata = {
  title: 'blr-rentals',
  description: 'One search over Bangalore rental listings from several portals.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const savedIds = await readShortlistIds();

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <SiteHeader savedCount={savedIds.length} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
