import type { LookupRequest, LookupResponse, PortalListing } from './api';
import { CARD_CSS, renderCard, type CardState } from './card';
import { parseListingUrl } from './parse';

const HOST_ID = 'blr-flat-hunt';

let host: HTMLDivElement | null = null;
let current: PortalListing | null = null;
let dismissedId: string | null = null;

function mount(): ShadowRoot {
  if (host?.isConnected && host.shadowRoot) return host.shadowRoot;
  host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CARD_CSS;
  shadow.append(style);
  document.documentElement.append(host);
  return shadow;
}

function unmount(): void {
  host?.remove();
  host = null;
}

function show(state: CardState, listing: PortalListing): void {
  const shadow = mount();
  shadow.querySelector('.card')?.remove();
  shadow.append(
    renderCard(state, listing.source, () => {
      dismissedId = listing.id;
      unmount();
    }),
  );
}

function lookup(listing: PortalListing): Promise<LookupResponse> {
  const request: LookupRequest = { type: 'lookup', source: listing.source, id: listing.id };
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(request, (response: LookupResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ kind: 'error', message: chrome.runtime.lastError?.message ?? 'no response' });
      } else {
        resolve(response);
      }
    });
  });
}

async function update(): Promise<void> {
  const listing = parseListingUrl(location.href);
  if (!listing) {
    current = null;
    unmount();
    return;
  }
  if (current && current.source === listing.source && current.id === listing.id) return;
  current = listing;
  if (dismissedId === listing.id) return;
  show({ kind: 'loading' }, listing);
  const response = await lookup(listing);
  if (current?.id === listing.id && dismissedId !== listing.id) show(response, listing);
}

function watchNavigation(): void {
  const fire = () => window.dispatchEvent(new Event('blr:locationchange'));
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args);
      fire();
      return result;
    };
  }
  window.addEventListener('popstate', fire);
  window.addEventListener('blr:locationchange', () => void update());
}

watchNavigation();
void update();
