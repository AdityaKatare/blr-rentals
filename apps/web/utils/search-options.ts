import type { LocalityMatch, SocietyOption } from '@blr/db';

export interface ComboOption {
  value: string;
  hint?: string | null;
  href?: string;
  note?: string;
}

export const buildingHref = (slug: string): string => `/societies/${slug}`;

export function placeOptions(localities: readonly LocalityMatch[], buildings: readonly SocietyOption[]): ComboOption[] {
  return [
    ...localities.map((l) => ({ value: l.name, hint: l.aliases.join(', ') || null })),
    ...buildings.map((b) => ({
      value: b.name,
      href: buildingHref(b.slug),
      note: `Apartment · ${b.units} ${b.units === 1 ? 'unit' : 'units'}`,
    })),
  ];
}

export function exactPageFor(options: readonly ComboOption[], text: string): string | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  const exact = options.filter((o) => o.value.toLowerCase() === q);
  if (exact.some((o) => !o.href)) return null;
  return exact[0]?.href ?? null;
}
