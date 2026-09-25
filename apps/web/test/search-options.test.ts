import type { LocalityMatch, SocietyOption } from '@blr/db';
import { describe, expect, it } from 'vitest';
import { exactPageFor, placeOptions } from '@/utils/search-options';

const locality = (name: string, aliases: string[] = []): LocalityMatch => ({
  id: 1,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  aliases,
  lat: 12.97,
  lng: 77.6,
});

const building = (name: string, units: number): SocietyOption => ({
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  units,
});

describe('placeOptions', () => {
  it('lists areas first, then apartments that open their own page', () => {
    const options = placeOptions(
      [locality('Koramangala', ['Kormangala']), locality('Whitefield')],
      [building('Prestige Shantiniketan', 23), building('Tiny Towers', 1)],
    );
    expect(options).toEqual([
      { value: 'Koramangala', hint: 'Kormangala' },
      { value: 'Whitefield', hint: null },
      { value: 'Prestige Shantiniketan', href: '/societies/prestige-shantiniketan', note: 'Apartment · 23 units' },
      { value: 'Tiny Towers', href: '/societies/tiny-towers', note: 'Apartment · 1 unit' },
    ]);
  });
});

describe('exactPageFor', () => {
  const options = placeOptions(
    [locality('Koramangala'), locality('Brigade Gateway')],
    [building('Prestige Shantiniketan', 23), building('Brigade Gateway', 9)],
  );

  it('opens an apartment typed out in full, whatever the case or spacing', () => {
    expect(exactPageFor(options, '  prestige shantiniketan ')).toBe('/societies/prestige-shantiniketan');
  });

  it('leaves the search alone for areas, partial names and blanks', () => {
    expect(exactPageFor(options, 'Koramangala')).toBeNull();
    expect(exactPageFor(options, 'Prestige')).toBeNull();
    expect(exactPageFor(options, '   ')).toBeNull();
  });

  it('prefers the area when an area and an apartment share a name', () => {
    expect(exactPageFor(options, 'Brigade Gateway')).toBeNull();
  });
});
