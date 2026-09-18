import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { readShortlistIds } from '@/server/shortlist';
import './globals.css';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-display-face' });
const sans = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-sans-face' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono-face' });

export const metadata: Metadata = {
  title: { default: 'blr-rentals', template: '%s · blr-rentals' },
  description: 'One search over Bangalore rental listings from several portals.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const savedIds = await readShortlistIds();

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <SiteHeader savedCount={savedIds.length} />
        <main>{children}</main>
      </body>
    </html>
  );
}
