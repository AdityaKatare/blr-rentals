import Link from 'next/link';
import { GUTTER, PAGE_WIDTH } from './page';
import { NavLinks } from './nav-links';

export function SiteHeader({ savedCount }: { savedCount: number }) {
  const links = [
    { href: '/', label: 'Search' },
    { href: '/shortlist', label: savedCount > 0 ? `Shortlist · ${savedCount}` : 'Shortlist' },
    { href: '/societies', label: 'Apartments' },
    { href: '/status', label: 'Status' },
  ];

  return (
    <header className="border-b border-ink bg-paper">
      <div
        className={`${PAGE_WIDTH} ${GUTTER} flex flex-col items-start gap-1 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0`}
      >
        <Link href="/" className="font-display text-[22px] leading-none whitespace-nowrap sm:text-[26px]">
          blr-rentals
        </Link>
        <NavLinks links={links} />
      </div>
    </header>
  );
}
