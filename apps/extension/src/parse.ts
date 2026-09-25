import type { PortalListing } from './api';

const NOBROKER_DETAIL = /^https:\/\/www\.nobroker\.in\/property\/[^/?#]+\/([0-9a-f]{32})\/detail(?:[/?#]|$)/i;
const MAGICBRICKS_ID = /[?&]id=([0-9a-f]+)/i;

function hexToAscii(hex: string): string {
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

export function parseListingUrl(href: string): PortalListing | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const nobroker = NOBROKER_DETAIL.exec(href);
  if (nobroker) return { source: 'nobroker', id: nobroker[1]!.toLowerCase() };
  if (url.hostname === 'www.magicbricks.com' && url.pathname.startsWith('/propertyDetails/')) {
    const match = MAGICBRICKS_ID.exec(href);
    if (!match) return null;
    const id = hexToAscii(match[1]!).replace(/^MB/i, '');
    return /^\d+$/.test(id) ? { source: 'magicbricks', id } : null;
  }
  return null;
}
