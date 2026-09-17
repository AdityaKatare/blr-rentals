const FLIGHT_PUSH = /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*<\/script>/g;

export function nextFlightPayload(html: string): string {
  let payload = '';
  for (const match of html.matchAll(FLIGHT_PUSH)) {
    const entry: unknown = JSON.parse(match[1] as string);
    if (Array.isArray(entry) && typeof entry[1] === 'string') payload += entry[1];
  }
  return payload;
}
