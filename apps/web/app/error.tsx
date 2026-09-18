'use client';

import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="font-display text-[32px] leading-none">Something broke</h1>
      <p className="mt-3 text-[13px] text-second">The page could not be rendered. Try again, or change the filters.</p>
      <div className="mt-5">
        <Button variant="solid" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
