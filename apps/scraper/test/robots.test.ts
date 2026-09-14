import { describe, expect, it } from 'vitest';
import { RobotsDisallowedError, RobotsUnavailableError, createRobotsGate } from '../src/http/robots';

const ROBOTS = 'User-agent: *\nDisallow: /api/\nDisallow: /private\nAllow: /\n';

function fakeFetch(status: number, body = ROBOTS) {
  let calls = 0;
  const impl = (async () => {
    calls += 1;
    return new Response(status === 404 ? '' : body, { status });
  }) as unknown as typeof fetch;
  return { impl, calls: () => calls };
}

describe('robots gate', () => {
  it('allows and disallows per path', async () => {
    const { impl } = fakeFetch(200);
    const gate = createRobotsGate({ userAgent: 'blr-rentals/0.1', fetchImpl: impl });
    expect(await gate.isAllowed('https://example.com/property/rent/bangalore')).toBe(true);
    expect(await gate.isAllowed('https://example.com/api/v3/filter')).toBe(false);
    await expect(gate.assertAllowed('https://example.com/private/x')).rejects.toBeInstanceOf(RobotsDisallowedError);
  });

  it('fetches robots.txt once per origin and caches it', async () => {
    const { impl, calls } = fakeFetch(200);
    const gate = createRobotsGate({ userAgent: 'x', fetchImpl: impl });
    await gate.isAllowed('https://example.com/a');
    await gate.isAllowed('https://example.com/b');
    expect(calls()).toBe(1);
    gate.invalidate('https://example.com');
    await gate.isAllowed('https://example.com/c');
    expect(calls()).toBe(2);
  });

  it('treats a missing robots.txt as allow-all', async () => {
    const { impl } = fakeFetch(404);
    const gate = createRobotsGate({ userAgent: 'x', fetchImpl: impl });
    expect(await gate.isAllowed('https://example.com/anything')).toBe(true);
  });

  it('denies when robots.txt itself is blocked (default policy)', async () => {
    const { impl } = fakeFetch(403, 'Access Denied');
    const gate = createRobotsGate({ userAgent: 'x', fetchImpl: impl });
    await expect(gate.assertAllowed('https://example.com/x')).rejects.toBeInstanceOf(RobotsUnavailableError);
  });

  it('can be told to allow when robots.txt is unreachable', async () => {
    const { impl } = fakeFetch(503, 'down');
    const gate = createRobotsGate({ userAgent: 'x', fetchImpl: impl, onUnavailable: 'allow' });
    expect(await gate.isAllowed('https://example.com/x')).toBe(true);
  });
});
