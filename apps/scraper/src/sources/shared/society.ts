const PLACEHOLDER_SOCIETY =
  /^(independent\s*(house|building)|stand\s*a?lone(\s*building)?|apartments?|flats?|house|building|villa|none|na|n\/a|nil|-+|\.+)$/i;
const NOT_A_SOCIETY = /^stand\s*a?lone\b|\b(rwa|welfare\s+association)$/i;
const PROJECT_PREFIX = /^project\s+/i;
const HOUSE_NUMBER = /^(no\.?\s*-?\s*)?\d+[a-z]?$/i;
const NEIGHBOURHOOD = /\b(layout|colony|nagar|nagara|extension|stage|puram|pura|halli|palya|cross|main|road)$/i;

export type PlaceNames = ReadonlySet<string>;

const placeKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export function placeNames(localities: readonly { name: string; aliases: readonly string[] }[]): PlaceNames {
  return new Set(localities.flatMap((l) => [l.name, ...l.aliases]).map(placeKey).filter(Boolean));
}

function withoutTrailingNeighbourhood(name: string, places: PlaceNames): string {
  const words = name.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const tail = words.slice(i).join(' ');
    if (NEIGHBOURHOOD.test(tail) && places.has(placeKey(tail))) return words.slice(0, i).join(' ');
  }
  return name;
}

export function societyName(value: unknown, places: PlaceNames): string | null {
  if (typeof value !== 'string') return null;
  const head = value.split(',')[0]!.replace(/[\s.\-]+$/, '').trim();
  if (head === '' || PLACEHOLDER_SOCIETY.test(head) || NOT_A_SOCIETY.test(head) || HOUSE_NUMBER.test(head)) return null;
  const core = head.replace(PROJECT_PREFIX, '');
  if (places.has(placeKey(core))) return null;
  const name = withoutTrailingNeighbourhood(core, places);
  return NEIGHBOURHOOD.test(name) ? null : name;
}
