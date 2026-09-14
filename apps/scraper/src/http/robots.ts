import robotsParser from 'robots-parser';
import type { Logger } from 'pino';

export class RobotsDisallowedError extends Error {
  constructor(
    readonly url: string,
    readonly userAgent: string,
  ) {
    super(`robots.txt disallows ${url} for "${userAgent}"`);
    this.name = 'RobotsDisallowedError';
  }
}

export class RobotsUnavailableError extends Error {
  constructor(
    readonly origin: string,
    readonly status: number,
  ) {
    super(`robots.txt for ${origin} could not be fetched (status ${status}); refusing to crawl`);
    this.name = 'RobotsUnavailableError';
  }
}

export interface RobotsGateOptions {
  userAgent: string;
  fetchImpl?: typeof fetch;
  ttlMs?: number;
  /** What to do when robots.txt is unreachable (403/406/5xx/network). Default: deny. */
  onUnavailable?: 'deny' | 'allow';
  timeoutMs?: number;
  now?: () => number;
  logger?: Pick<Logger, 'info' | 'warn'>;
}

export interface RobotsGate {
  isAllowed(url: string): Promise<boolean>;
  assertAllowed(url: string): Promise<void>;
  invalidate(origin?: string): void;
}

interface Entry {
  allows: (url: string) => boolean;
  fetchedAt: number;
  status: number;
}

/** Fetches and caches robots.txt per origin; every request goes through assertAllowed(). */
export function createRobotsGate(opts: RobotsGateOptions): RobotsGate {
  const {
    userAgent,
    fetchImpl = fetch,
    ttlMs = 6 * 60 * 60 * 1000,
    onUnavailable = 'deny',
    timeoutMs = 15_000,
    now = Date.now,
    logger,
  } = opts;
  const cache = new Map<string, Promise<Entry>>();

  function unavailable(origin: string, status: number, detail?: string): Entry {
    if (onUnavailable === 'allow') {
      logger?.warn({ origin, status, detail }, 'robots.txt unavailable; policy=allow');
      return { allows: () => true, fetchedAt: now(), status };
    }
    throw new RobotsUnavailableError(origin, status);
  }

  async function load(origin: string): Promise<Entry> {
    const url = `${origin}/robots.txt`;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { 'user-agent': userAgent, accept: 'text/plain,*/*;q=0.5' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      return unavailable(origin, 0, String(err));
    }
    if (res.status === 404 || res.status === 410) {
      logger?.info({ origin }, 'no robots.txt; everything allowed');
      return { allows: () => true, fetchedAt: now(), status: res.status };
    }
    if (!res.ok) return unavailable(origin, res.status);
    const parsed = robotsParser(url, await res.text());
    return { allows: (u) => parsed.isAllowed(u, userAgent) !== false, fetchedAt: now(), status: res.status };
  }

  async function entryFor(url: string): Promise<Entry> {
    const origin = new URL(url).origin;
    const cached = cache.get(origin);
    if (cached) {
      const entry = await cached.catch(() => undefined);
      if (entry && now() - entry.fetchedAt < ttlMs) return entry;
    }
    const pending = load(origin);
    cache.set(origin, pending);
    try {
      return await pending;
    } catch (err) {
      cache.delete(origin);
      throw err;
    }
  }

  return {
    async isAllowed(url) {
      return (await entryFor(url)).allows(url);
    },
    async assertAllowed(url) {
      if (!(await entryFor(url)).allows(url)) throw new RobotsDisallowedError(url, userAgent);
    },
    invalidate(origin) {
      if (origin) cache.delete(origin);
      else cache.clear();
    },
  };
}
