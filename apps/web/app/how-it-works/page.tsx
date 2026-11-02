import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeadline, PageShell } from '@/components/layout/page';
import { AUTHOR, SITE_URL } from '@/constants/site';

const TITLE = 'How I built BLR Flat Hunt: one search over Bangalore’s rental portals';
const DESCRIPTION =
  'Why BLR Flat Hunt needs no sign-up, how its Chrome extension shows the same flat on the other portal, and how it spots one flat listed twice.';
const PUBLISHED = '2026-11-02';
const RELEASE_URL = 'https://github.com/AdityaKatare/blr-rentals/releases/latest';
const REPO_URL = 'https://github.com/AdityaKatare/blr-rentals';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/how-it-works' },
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  openGraph: {
    type: 'article',
    title: TITLE,
    description: DESCRIPTION,
    url: '/how-it-works',
    publishedTime: PUBLISHED,
    authors: [AUTHOR.url],
  },
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: TITLE,
  description: DESCRIPTION,
  datePublished: PUBLISHED,
  mainEntityOfPage: `${SITE_URL}/how-it-works`,
  author: {
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
    jobTitle: 'Software Engineer',
    worksFor: { '@type': 'Organization', name: 'SuretyNow' },
    sameAs: AUTHOR.sameAs,
  },
};

const WEIGHTS: Array<[string, string]> = [
  ['Distance apart', '25%'],
  ['Apartment-complex name similarity', '20%'],
  ['Rent within ~10%', '15%'],
  ['Carpet area within ~15%', '15%'],
  ['Same floor', '8%'],
  ['Same total floors in the building', '5%'],
  ['Bathrooms, furnishing, deposit', '4% each'],
];

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 mb-4 font-display text-[24px] leading-tight sm:text-[28px]">{children}</h2>;
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 mb-3 text-[17px] font-semibold">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="my-4">{children}</p>;
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="underline underline-offset-2 hover:text-warn">
      {children}
    </a>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="bg-shade px-1 font-mono text-[14px]">{children}</code>;
}

function List({ ordered, children }: { ordered?: boolean; children: ReactNode }) {
  const className = `my-4 flex flex-col gap-2 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`;
  return ordered ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

export default function HowItWorksPage() {
  return (
    <PageShell width="reading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <article>
        <PageHeadline title={TITLE}>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            By{' '}
            <a href={AUTHOR.url} rel="author" className="text-ink underline underline-offset-2 hover:text-warn">
              {AUTHOR.name}
            </a>{' '}
            · <time dateTime={PUBLISHED}>2 November 2026</time>
          </p>
        </PageHeadline>

        <div className="max-w-[68ch] py-6 text-[16px] leading-[1.7] text-second">
          <P>
            Every few weeks someone around me starts looking for a flat in Bangalore, and the routine is always the same.
            NoBroker in one tab, MagicBricks in another. The same 2BHK shows up on both at two different rents. A listing
            that looks cheap turns out to want a ten-month deposit. And half the portals want you to sign up before
            they’ll show you anything useful.
          </P>
          <P>
            After watching enough friends and colleagues go through this, I built <A href="/">BLR Flat Hunt</A>: one search
            over both portals, with duplicates merged, the nearest metro station on every listing, and listings sorted by
            what it actually costs to move in.
          </P>
          <P>
            This post covers the two ideas I care most about, and the engineering behind them: keeping it free without a
            sign-up, and showing you the same flat on the other portal without making you hunt for it.
          </P>

          <H2>No sign-up, ever</H2>
          <P>The rule from day one: you should be able to use the whole thing without creating an account.</P>
          <P>That turned out to be mostly a design decision, not a technical one:</P>
          <List>
            <li>
              <strong className="text-ink">Search, filters and sorting are all in the URL.</strong> Nothing about your
              search is stored on a server, and you can share a search by copying the link.
            </li>
            <li>
              <strong className="text-ink">The shortlist lives in your browser.</strong> Tap to save a flat and it goes
              into a cookie on your device. No email, no password, no “verify your number to continue”.
            </li>
            <li>
              <strong className="text-ink">We never store anyone’s contact details.</strong> Only whether a listing is
              from an owner or a broker. When you want to call someone, you go to the original listing on the portal and
              contact them there.
            </li>
          </List>
          <P>
            That last point is the one I like most. You get all the information first, for free, and you only hand over
            your number to a portal when you’ve actually decided a flat is worth a call. The information isn’t held back
            as bait for a sign-up.
          </P>

          <H2>The extension: compare without switching tabs</H2>
          <P>
            Search is useful when you’re starting out, but most people already have a portal open. So I built a small
            Chrome extension that brings the comparison to you.
          </P>
          <P>Open any flat on NoBroker or MagicBricks and a small card appears in the corner of the page:</P>
          <List>
            <li>
              <strong className="text-ink">“Also on MagicBricks — ₹27,000, ₹2,000 less”</strong>, linking straight to the
              same flat on the other portal
            </li>
            <li>
              the <strong className="text-ink">nearest metro station</strong> and how far it is
            </li>
            <li>
              the <strong className="text-ink">real move-in cost</strong>: rent + deposit + maintenance + brokerage if a
              broker listed it
            </li>
            <li>
              whether the <strong className="text-ink">rent has dropped</strong> recently
            </li>
            <li>
              a link to the <strong className="text-ink">building’s page</strong>, with every unit we’ve seen there and
              its rent range
            </li>
          </List>
          <P>It isn’t on the Chrome Web Store yet, so for now you install it from GitHub:</P>
          <List ordered>
            <li>
              Download <Code>blr-flat-hunt-extension.zip</Code> from the <A href={RELEASE_URL}>latest release</A> and
              unzip it.
            </li>
            <li>
              Open <Code>chrome://extensions</Code> and switch on <strong className="text-ink">Developer mode</strong>{' '}
              (top right).
            </li>
            <li>
              Click <strong className="text-ink">Load unpacked</strong> and pick the unzipped{' '}
              <Code>blr-flat-hunt-extension</Code> folder.
            </li>
            <li>Open any flat on NoBroker or MagicBricks.</li>
          </List>
          <P>
            The card is powered by the duplicate matching described below: the extension sends only the portal name and
            the listing’s ID, and the site answers with what it knows about that home.
          </P>
          <List>
            <li>
              <strong className="text-ink">It doesn’t break the page.</strong> The card renders inside a Shadow DOM, so
              the portal’s CSS can’t mangle it and its CSS can’t leak into the portal.
            </li>
            <li>
              <strong className="text-ink">It keeps up with single-page navigation.</strong> Both portals change listings
              without full page loads, so the extension watches the browser’s history changes and refreshes the card when
              you move to another flat.
            </li>
            <li>
              <strong className="text-ink">It asks for almost nothing.</strong> It needs no special Chrome permissions,
              only access to BLR Flat Hunt’s own lookup endpoint. It doesn’t read your browsing history or anything else
              on the page.
            </li>
          </List>

          <H2>Spotting the same flat twice</H2>
          <P>
            The core problem: the same flat is often listed on both portals, sometimes by the owner on one and a broker on
            the other, and at different rents. To show it once, with “also listed at ₹X”, you have to decide when two
            listings are really the same home. The portals don’t share IDs, the addresses are free text, and plenty of
            fields are simply missing.
          </P>

          <H3>Finding candidates</H3>
          <P>
            Comparing every listing with every other one doesn’t scale. So for each listing, the database (Postgres with
            PostGIS) only looks at:
          </P>
          <List>
            <li>
              other listings within <strong className="text-ink">250 metres</strong>, or
            </li>
            <li>listings whose apartment-complex name is a close text match (trigram similarity above 0.6).</li>
          </List>
          <P>That turns an impossible all-pairs problem into a handful of comparisons per listing.</P>

          <H3>Scoring a pair</H3>
          <P>Each candidate pair gets a score between 0 and 1 from a weighted set of signals:</P>
          <table className="my-5 w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                <th className="py-2 pr-4 font-normal">Signal</th>
                <th className="py-2 font-normal">Weight</th>
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map(([signal, weight]) => (
                <tr key={signal} className="border-b border-hair">
                  <td className="py-2 pr-4">{signal}</td>
                  <td className="py-2 tabular-nums">{weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <P>Two lessons came out of tuning this:</P>
          <List ordered>
            <li>
              <strong className="text-ink">Missing data is the normal case, not the exception.</strong> If one listing
              doesn’t mention the floor, that’s not evidence either way, so unknown fields score exactly half instead of
              zero. Without that, half-filled listings could never match anything.
            </li>
            <li>
              <strong className="text-ink">Identical flats are a trap.</strong> A big apartment complex can have dozens of
              near-identical 2BHKs at the same rent, the same size and the same location. Early on, those got merged into
              one “home”. The fix: if the floors are known and <em>different</em>, the score is cut in half. Two flats on
              different floors are two different homes, however similar everything else looks.
            </li>
          </List>
          <P>
            Pairs that score above <strong className="text-ink">0.75</strong> are grouped into one home. The most recently
            updated listing leads, and the others appear as “also listed on…” with their prices, with a flag when one of
            them is cheaper. Grouping runs as a batch over the whole index rather than on every page load.
          </P>

          <H2>Lessons</H2>
          <List>
            <li>
              <strong className="text-ink">Design for missing data first.</strong> Real listings are messy. Every feature
              (dedupe, move-in cost, metro distance) had to cope gracefully with fields that simply aren’t there.
            </li>
            <li>
              <strong className="text-ink">The simplest privacy decision is not collecting the data.</strong> Not storing
              contact details and not requiring accounts removed a whole category of problems before they existed.
            </li>
            <li>
              <strong className="text-ink">Meet people where they already are.</strong> Most people mid-search already
              have a portal open. Putting the comparison on that page is more useful than asking them to start over on a
              new site.
            </li>
          </List>

          <H2>What’s next</H2>
          <List>
            <li>More portals, beyond NoBroker and MagicBricks.</li>
            <li>Keeping the index fresher, with scheduled daily updates.</li>
          </List>
          <P>
            If you’re hunting for a flat in Bangalore, <A href="/">try BLR Flat Hunt</A>. The code is on{' '}
            <A href={REPO_URL}>GitHub</A>. I’d love to hear what would make it more useful.
          </P>

          <p className="mt-10 border-t border-hair pt-4 text-[14px] italic">
            {AUTHOR.name} is a software engineer at SuretyNow (YC W24) in Bangalore. More work on{' '}
            <A href={AUTHOR.url}>GitHub</A> and <A href={AUTHOR.linkedin}>LinkedIn</A>.
          </p>
        </div>
      </article>
    </PageShell>
  );
}
