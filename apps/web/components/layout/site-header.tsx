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
      <div className={`${PAGE_WIDTH} ${GUTTER} flex h-14 items-center justify-between gap-4`}>
        <Link href="/" className="font-display text-[22px] leading-none sm:text-[26px]">
          blr-rentals
        </Link>
        <NavLinks links={links} />
      </div>
    </header>
  );
}
