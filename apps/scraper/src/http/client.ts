import type { Logger } from 'pino';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

/** 401/403/406: the host is refusing us. Never retried; the run must stop. */
export class BlockedError extends HttpError {
  constructor(status: number, url: string) {
    super(status, url, `Blocked with HTTP ${status} by ${new URL(url).host}; stopping (no retry, no evasion)`);
    this.name = 'BlockedError';
  }
}

export interface HttpClientOptions {
  userAgent: string;
  /** Minimum gap between two requests to the same host. */
  minDelayMs: number;
  jitterMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  logger?: Pick<Logger, 'debug' | 'warn'>;
}

export interface HttpResponse {
  url: string;
  finalUrl: string;
  status: number;
  body: string;
  headers: Headers;
  elapsedMs: number;
  attempts: number;
}

export interface HttpClient {
  get(url: string, init?: { accept?: string }): Promise<HttpResponse>;
  stats(): { requests: number; retries: number };
}

const BLOCKED_STATUSES = new Set([401, 403, 406]);
const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_ACCEPT = 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8';
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Polite HTTP GET: one request at a time per host, a minimum delay (+ jitter)
 * between them, bounded retries with backoff on 429/5xx/network errors, and a
 * hard stop on 401/403/406. Uses the global fetch (undici) — no extra deps.
 */
export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const {
    userAgent,
    minDelayMs,
    jitterMs = 0,
    timeoutMs = 30_000,
    maxRetries = 3,
    fetchImpl = fetch,
    sleep = defaultSleep,
    now = Date.now,
    random = Math.random,
    logger,
  } = opts;

  const hosts = new Map<string, { chain: Promise<unknown>; lastAt: number }>();
  let requests = 0;
  let retries = 0;

  async function once(url: string, accept: string) {
    requests += 1;
    const res = await fetchImpl(url, {
      headers: { 'user-agent': userAgent, accept, 'accept-language': 'en-IN,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.text();
    return { status: res.status, body, headers: res.headers, finalUrl: res.url || url };
  }

  async function withRetry(url: string, accept: string, host: { lastAt: number }): Promise<HttpResponse> {
    const started = now();
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (attempt > 0) {
        retries += 1;
        const backoff = Math.min(60_000, 2_000 * 2 ** (attempt - 1)) + random() * 1_000;
        logger?.warn({ url, attempt, backoffMs: Math.round(backoff) }, 'retrying');
        await sleep(backoff);
      }
      try {
        const r = await once(url, accept);
        host.lastAt = now();
        if (BLOCKED_STATUSES.has(r.status)) throw new BlockedError(r.status, url);
        if (RETRY_STATUSES.has(r.status)) {
          lastError = new HttpError(r.status, url);
          const retryAfter = Number(r.headers.get('retry-after'));
          if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(retryAfter, 120) * 1_000);
          continue;
        }
        if (r.status < 200 || r.status >= 300) throw new HttpError(r.status, url);
        return { url, ...r, elapsedMs: now() - started, attempts: attempt + 1 };
      } catch (err) {
        host.lastAt = now();
        if (err instanceof HttpError) throw err; // blocked or a non-retryable status
        lastError = err; // network error / timeout → retry
        logger?.debug({ url, err: String(err) }, 'request failed');
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`request failed: ${String(lastError)}`);
  }

  async function get(url: string, init: { accept?: string } = {}): Promise<HttpResponse> {
    const host = new URL(url).host;
    const state = hosts.get(host) ?? { chain: Promise.resolve(), lastAt: 0 };
    hosts.set(host, state);
    const run = state.chain.then(async () => {
      const wait = state.lastAt === 0 ? 0 : Math.max(0, state.lastAt + minDelayMs + random() * jitterMs - now());
      if (wait > 0) await sleep(wait);
      return withRetry(url, init.accept ?? DEFAULT_ACCEPT, state);
    });
    state.chain = run.catch(() => undefined);
    return run;
  }

  return { get, stats: () => ({ requests, retries }) };
}
