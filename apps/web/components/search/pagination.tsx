import Link from 'next/link';
import { withParams, type Params } from '@/utils/search-params';

interface PaginationProps {
  params: Params;
  page: number;
  pages: number;
}

export function Pagination({ params, page, pages }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between pt-2 text-sm">
      {page > 1 ? (
        <Link href={withParams(params, { page: String(page - 1) })} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-500">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={withParams(params, { page: String(page + 1) })} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
