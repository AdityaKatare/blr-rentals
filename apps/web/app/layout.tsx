import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Telemetry } from '@/components/layout/telemetry';
import { AUTHOR, SITE_URL } from '@/constants/site';
import { readShortlistIds } from '@/server/shortlist';
import './globals.css';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-display-face' });
const sans = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-sans-face' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono-face' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'blrflathunt: Bangalore flats for rent', template: '%s · blrflathunt' },
  description:
    'Search Bangalore flats for rent from NoBroker, MagicBricks and other portals in one place, with the nearest metro and tech park for every listing.',
  applicationName: 'blrflathunt',
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  openGraph: { type: 'website', siteName: 'blrflathunt', url: '/' },
  verification: { google: '8pKoyZ7sDW_3uztpp6pi9NEpG1qrvIF2SYPaxEWamOc' },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'blrflathunt',
  alternateName: ['blr flat hunt', 'BLR Flat Hunt'],
  url: `${SITE_URL}/`,
  creator: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url, sameAs: AUTHOR.sameAs },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const savedIds = await readShortlistIds();

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <SiteHeader savedCount={savedIds.length} />
        <main>{children}</main>
        <SiteFooter />
        <Telemetry />
      </body>
    </html>
  );
}
