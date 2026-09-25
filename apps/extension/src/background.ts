import { LOOKUP_URL, type LookupBody, type LookupRequest, type LookupResponse } from './api';

async function lookup(source: LookupRequest['source'], id: string): Promise<LookupResponse> {
  const url = new URL(LOOKUP_URL);
  url.searchParams.set('source', source);
  url.searchParams.set('id', id);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return { kind: 'missing' };
  if (!res.ok) return { kind: 'error', message: `HTTP ${res.status}` };
  const body = (await res.json()) as LookupBody;
  return { kind: 'found', listing: body.listing, lastSeenAt: body.lastSeenAt };
}

chrome.runtime.onMessage.addListener((message: LookupRequest, _sender, sendResponse: (r: LookupResponse) => void) => {
  if (message?.type !== 'lookup') return false;
  lookup(message.source, message.id).then(sendResponse, (err: unknown) =>
    sendResponse({ kind: 'error', message: err instanceof Error ? err.message : String(err) }),
  );
  return true;
});
