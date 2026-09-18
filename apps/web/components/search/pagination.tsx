import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { withParams, type Params } from '@/utils/search-params';

interface PaginationProps {
  params: Params;
  page: number;
  pages: number;
  basePath?: string;
}

export function Pagination({ params, page, pages, basePath = '/' }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4 py-5 font-mono text-[11px] tracking-[0.08em] uppercase">
      {page > 1 ? (
        <Link href={withParams(params, { page: String(page - 1) }, basePath)} className={buttonClass('outline', 'sm')}>
          &larr; Previous
        </Link>
      ) : (
        <span className="text-muted">&larr; Previous</span>
      )}
      <span className="tabular text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={withParams(params, { page: String(page + 1) }, basePath)} className={buttonClass('outline', 'sm')}>
          Next &rarr;
        </Link>
      ) : (
        <span className="text-muted">Next &rarr;</span>
      )}
    </nav>
  );
}
