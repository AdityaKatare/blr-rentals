import { loadEnv } from '@blr/db';

export interface ScraperConfig {
  databaseUrl: string | undefined;
  /** Honest identity. Never a browser UA string. */
  userAgent: string;
  contact: string;
  minDelayMs: number;
  jitterMs: number;
  timeoutMs: number;
  maxRetries: number;
  logLevel: string;
}

const positive = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ScraperConfig {
  loadEnv();
  const contact = env.SCRAPER_CONTACT ?? 'mailto:unset@example.com';
  return {
    databaseUrl: env.DATABASE_URL,
    userAgent: env.SCRAPER_USER_AGENT ?? `blr-rentals/0.1 (+${contact}) personal-use`,
    contact,
    minDelayMs: positive(env.SCRAPER_MIN_DELAY_MS, 2500),
    jitterMs: positive(env.SCRAPER_JITTER_MS, 1000),
    timeoutMs: positive(env.SCRAPER_TIMEOUT_MS, 30_000),
    maxRetries: 3,
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}
