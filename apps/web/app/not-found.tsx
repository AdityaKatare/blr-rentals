import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="font-display text-[32px] leading-none">Page not found</h1>
      <p className="mt-3 text-[13px] text-second">
        That address does not match anything here.{' '}
        <Link href="/" className="underline underline-offset-4 hover:text-warn">
          Back to search
        </Link>
        .
      </p>
    </div>
  );
}
