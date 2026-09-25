import type { SearchHit } from '@blr/db';
import { SITE, type LookupResponse, type Portal } from './api';

export type CardState = { kind: 'loading' } | LookupResponse;

const SOURCE_LABELS: Record<string, string> = {
  nobroker: 'NoBroker',
  magicbricks: 'MagicBricks',
  housing: 'Housing',
  ninetynineacres: '99acres',
};

const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function timeAgo(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href: string, text: string, className = 'link'): HTMLAnchorElement {
  const a = el('a', className, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

export const CARD_CSS = `
  :host { all: initial; }
  .card { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 300px; box-sizing: border-box;
    padding: 12px 14px; background: #fffdf7; color: #1a1a1a; border: 1px solid #1a1a1a; box-shadow: 4px 4px 0 #1a1a1a;
    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .brand { font: 600 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase;
    color: #6b6b6b; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .brand a { color: inherit; text-decoration: none; }
  .close { all: unset; cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 5px; }
  .close:hover { background: #1a1a1a; color: #fffdf7; }
  .row { margin: 6px 0; }
  .lead { font-weight: 600; }
  .good { color: #1b7a3d; }
  .muted { color: #6b6b6b; font-size: 12px; }
  .link { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .link:hover { color: #b45309; }
  .foot { margin-top: 10px; padding-top: 8px; border-top: 1px solid #d9d4c7; display: flex; justify-content: space-between; gap: 8px; }
`;

function foundRows(hit: SearchHit, lastSeenAt: string, now: number): HTMLElement[] {
  const rows: HTMLElement[] = [];

  const others = [...hit.otherListings].sort((a, b) => a.rent - b.rent);
  const cheapest = others[0];
  if (cheapest) {
    const diff = hit.rent - cheapest.rent;
    const row = el('div', 'row lead');
    row.append(link(cheapest.sourceUrl, `Also on ${SOURCE_LABELS[cheapest.source] ?? cheapest.source} — ${rupees(cheapest.rent)} ↗`));
    if (diff > 0) row.append(el('span', 'good', ` ${rupees(diff)} less`));
    else if (diff < 0) row.append(el('span', 'muted', ` ${rupees(-diff)} more`));
    rows.push(row);
  } else {
    rows.push(el('div', 'row muted', `Only listed on ${SOURCE_LABELS[hit.source] ?? hit.source}`));
  }

  if (hit.nearestMetro) rows.push(el('div', 'row', `Nearest metro: ${hit.nearestMetro.name}, ${hit.nearestMetro.distanceM} m`));

  if (hit.moveInCost) {
    const c = hit.moveInCost;
    const parts = [`rent ${rupees(c.rent)}`, `deposit ${rupees(c.deposit)}`];
    if (c.maintenance) parts.push(`maintenance ${rupees(c.maintenance)}`);
    if (c.brokerage) parts.push(`brokerage ${rupees(c.brokerage)}`);
    const row = el('div', 'row');
    row.append(el('span', 'lead', `Move-in ≈ ${rupees(c.total)}`), el('div', 'muted', parts.join(' + ')));
    rows.push(row);
  }

  if (hit.rentDrop) rows.push(el('div', 'row good', `Rent dropped from ${rupees(hit.rentDrop.from)} ${timeAgo(hit.rentDrop.at, now)}`));

  const foot = el('div', 'foot muted');
  foot.append(el('span', undefined, hit.status === 'active' ? `as of ${timeAgo(lastSeenAt, now)}` : `no longer listed (${hit.status})`));
  if (hit.societySlug) foot.append(link(`${SITE}/societies/${hit.societySlug}`, 'See building →'));
  rows.push(foot);
  return rows;
}

export function renderCard(state: CardState, source: Portal, onClose: () => void, now = Date.now()): HTMLElement {
  const card = el('div', 'card');
  card.dataset.source = source;

  const brand = el('div', 'brand');
  brand.append(link(SITE, 'BLR Flat Hunt', ''));
  const close = el('button', 'close', '×');
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', onClose);
  brand.append(close);
  card.append(brand);

  if (state.kind === 'loading') {
    card.append(el('div', 'row muted', 'Looking up this listing…'));
  } else if (state.kind === 'missing') {
    card.append(el('div', 'row', 'Not in the index yet.'));
    const row = el('div', 'row muted');
    row.append('Only areas the scraper covers are indexed. ', link(SITE, 'Search on BLR Flat Hunt →'));
    card.append(row);
  } else if (state.kind === 'error') {
    card.append(el('div', 'row muted', `Could not reach BLR Flat Hunt (${state.message}).`));
  } else {
    card.append(...foundRows(state.listing, state.lastSeenAt, now));
  }
  return card;
}
