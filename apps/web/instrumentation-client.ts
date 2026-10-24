import posthog, { type CaptureResult } from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function stripQuery(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    url.search = '';
    return url.toString();
  } catch {
    return value;
  }
}

function withoutQueries(properties: Record<string, unknown> | undefined) {
  if (!properties) return;
  for (const name of Object.keys(properties)) {
    if (/url|referrer/i.test(name)) properties[name] = stripQuery(properties[name]);
  }
}

function withoutQuery(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  withoutQueries(event.properties);
  withoutQueries(event.$set);
  withoutQueries(event.$set_once);
  return event;
}

if (key) {
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-08-30',
    person_profiles: 'always',
    disable_surveys: true,
    before_send: withoutQuery,
  });
}
