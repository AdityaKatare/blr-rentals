'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

function withoutQuery<T extends { url: string }>(event: T): T {
  const url = new URL(event.url);
  url.search = '';
  return { ...event, url: url.toString() };
}

export function Telemetry() {
  return (
    <>
      <Analytics beforeSend={withoutQuery} />
      <SpeedInsights beforeSend={withoutQuery} />
    </>
  );
}
