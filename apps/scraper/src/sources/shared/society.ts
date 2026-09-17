const PLACEHOLDER_SOCIETY =
  /^(independent\s*(house|building)|stand\s*a?lone(\s*building)?|apartments?|flats?|house|building|villa|none|na|n\/a|nil|-+|\.+)$/i;

export function societyName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name !== '' && !PLACEHOLDER_SOCIETY.test(name) ? name : null;
}
