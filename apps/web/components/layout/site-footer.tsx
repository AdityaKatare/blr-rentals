import { AUTHOR } from '@/constants/site';
import { GUTTER, PAGE_WIDTH } from './page';

export function SiteFooter() {
  return (
    <footer className="border-t border-ink bg-paper">
      <div className={`${PAGE_WIDTH} ${GUTTER} py-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted`}>
        Built by{' '}
        <a href={AUTHOR.url} rel="author" className="text-ink underline underline-offset-2 hover:text-warn">
          {AUTHOR.name}
        </a>
      </div>
    </footer>
  );
}
