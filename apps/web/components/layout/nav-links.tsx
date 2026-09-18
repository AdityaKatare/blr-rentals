'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.08em] sm:gap-7">
      {links.map((link) => {
        const current = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={`py-1 hover:text-warn ${current ? 'border-b-2 border-ink' : 'border-b-2 border-transparent'}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
