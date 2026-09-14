import { describe, expect, it } from 'vitest';
import { BlockedError, HttpError, createHttpClient } from '../src/http/client';

interface Scripted {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

function fakeFetch(script: Scripted[]) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: (init?.headers as Record<string, string>) ?? {} });
    const next = script.shift() ?? { status: 200, body: 'ok' };
    return new Response(next.body ?? '', { status: next.status, headers: next.headers });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const noSleep = async () => undefined;

describe('http client', () => {
  it('retries a 5xx and then succeeds', async () => {
    const { impl, calls } = fakeFetch([{ status: 503 }, { status: 200, body: 'hello' }]);
    const client = createHttpClient({ userAgent: 'test-ua', minDelayMs: 0, fetchImpl: impl, sleep: noSleep });
    const res = await client.get('https://example.com/a');
    expect(res.body).toBe('hello');
    expect(res.attempts).toBe(2);
    expect(calls).toHaveLength(2);
    expect(client.stats()).toEqual({ requests: 2, retries: 1 });
  });

  it('sends the configured user-agent and never a browser UA', async () => {
    const { impl, calls } = fakeFetch([{ status: 200 }]);
    const client = createHttpClient({ userAgent: 'blr-rentals/0.1 (+mailto:x@y.z)', minDelayMs: 0, fetchImpl: impl, sleep: noSleep });
    await client.get('https://example.com/');
    expect(calls[0]?.headers['user-agent']).toBe('blr-rentals/0.1 (+mailto:x@y.z)');
  });

  it('throws BlockedError on 403 without retrying', async () => {
    const { impl, calls } = fakeFetch([{ status: 403 }, { status: 200 }]);
    const client = createHttpClient({ userAgent: 't', minDelayMs: 0, fetchImpl: impl, sleep: noSleep });
    await expect(client.get('https://blocked.example/x')).rejects.toBeInstanceOf(BlockedError);
    expect(calls).toHaveLength(1);
  });

  it('throws HttpError on 404 without retrying', async () => {
    const { impl, calls } = fakeFetch([{ status: 404 }]);
    const client = createHttpClient({ userAgent: 't', minDelayMs: 0, fetchImpl: impl, sleep: noSleep });
    await expect(client.get('https://example.com/missing')).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
  });

  it('gives up after maxRetries', async () => {
    const { impl, calls } = fakeFetch([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 200 }]);
    const client = createHttpClient({ userAgent: 't', minDelayMs: 0, maxRetries: 2, fetchImpl: impl, sleep: noSleep });
    const err = await client.get('https://example.com/flaky').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(500);
    expect(calls).toHaveLength(3);
  });

  it('retries on network errors', async () => {
    let n = 0;
    const impl = (async () => {
      n += 1;
      if (n === 1) throw new TypeError('fetch failed');
      return new Response('late', { status: 200 });
    }) as unknown as typeof fetch;
    const client = createHttpClient({ userAgent: 't', minDelayMs: 0, fetchImpl: impl, sleep: noSleep });
    expect((await client.get('https://example.com/net')).body).toBe('late');
    expect(n).toBe(2);
  });

  it('spaces consecutive requests to the same host by minDelayMs', async () => {
    let clock = 1_000;
    const sleeps: number[] = [];
    const sleep = async (ms: number) => {
      sleeps.push(ms);
      clock += ms;
    };
    const { impl } = fakeFetch([{ status: 200 }, { status: 200 }, { status: 200 }]);
    const client = createHttpClient({ userAgent: 't', minDelayMs: 2_500, fetchImpl: impl, sleep, now: () => clock, random: () => 0 });
    await client.get('https://example.com/1');
    await client.get('https://example.com/2');
    await client.get('https://other.example/3');
    expect(sleeps).toEqual([2_500]);
  });
});
