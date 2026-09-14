/**
 * Extract the JSON value (object or array) that follows `marker` in a page,
 * e.g. `window.__INITIAL_STATE__ = {...};`. Bracket matching is string-aware,
 * so braces inside JSON strings do not confuse it. Returns the parsed value.
 *
 * All four sources embed their listing state this way:
 *   NoBroker      nb.appState = {...}
 *   MagicBricks   window.SERVER_PRELOADED_STATE_ = {...}
 *   Housing.com   window.__INITIAL_STATE__ = {...}
 *   99acres       window.__initialData__ = {...}
 */
export function extractInlineJson(text: string, marker: string | RegExp): unknown {
  let start = -1;
  let markerLength = 0;
  if (typeof marker === 'string') {
    start = text.indexOf(marker);
    markerLength = marker.length;
  } else {
    const m = marker.exec(text);
    if (m) {
      start = m.index;
      markerLength = m[0].length;
    }
  }
  if (start < 0) throw new Error(`inline JSON marker not found: ${String(marker)}`);

  let i = start + markerLength;
  while (i < text.length && /\s/.test(text[i] ?? '')) i += 1;
  const open = text[i];
  if (open !== '{' && open !== '[') {
    throw new Error(`expected { or [ after marker, found ${JSON.stringify(open ?? 'EOF')}`);
  }
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let j = i; j < text.length; j += 1) {
    const c = text[j] as string;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{' || c === '[') depth += 1;
    else if (c === '}' || c === ']') {
      depth -= 1;
      if (depth === 0) {
        if (c !== close) throw new Error('unbalanced brackets in inline JSON');
        return JSON.parse(text.slice(i, j + 1));
      }
    }
  }
  throw new Error('unterminated inline JSON');
}
