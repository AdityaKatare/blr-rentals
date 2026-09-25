import { describe, expect, it } from 'vitest';
import { SHORTLIST_MAX } from '@/constants/shortlist';
import {
  parseShortlist,
  parseShortlistSize,
  serializeShortlist,
  shortlistSizeHref,
  toggleShortlist,
} from '@/utils/shortlist';

const uuid = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

describe('parseShortlist', () => {
  it('is empty without a cookie', () => {
    expect(parseShortlist(undefined)).toEqual([]);
    expect(parseShortlist('')).toEqual([]);
  });

  it('keeps only well-formed ids, lowercased and without repeats', () => {
    const upper = uuid(1).toUpperCase();
    expect(parseShortlist(`${upper}.not-an-id.${uuid(2)}.${uuid(1)}`)).toEqual([uuid(1), uuid(2)]);
  });

  it(`stops at ${SHORTLIST_MAX} ids`, () => {
    const ids = Array.from({ length: SHORTLIST_MAX + 20 }, (_, i) => uuid(i));
    expect(parseShortlist(ids.join('.'))).toEqual(ids.slice(0, SHORTLIST_MAX));
  });
});

describe('toggleShortlist', () => {
  it('puts a newly saved id first', () => {
    expect(toggleShortlist([uuid(1)], uuid(2).toUpperCase())).toEqual([uuid(2), uuid(1)]);
  });

  it('removes an id that is already saved, whatever its case', () => {
    expect(toggleShortlist([uuid(1), uuid(2)], uuid(1).toUpperCase())).toEqual([uuid(2)]);
  });

  it('drops the oldest id when the list is full', () => {
    const full = Array.from({ length: SHORTLIST_MAX }, (_, i) => uuid(i));
    const next = toggleShortlist(full, uuid(999));
    expect(next).toHaveLength(SHORTLIST_MAX);
    expect(next[0]).toBe(uuid(999));
    expect(next).not.toContain(full[SHORTLIST_MAX - 1]);
  });
});

describe('serializeShortlist', () => {
  it('round-trips through parseShortlist', () => {
    const ids = [uuid(3), uuid(1), uuid(2)];
    expect(parseShortlist(serializeShortlist(ids))).toEqual(ids);
  });
});

describe('parseShortlistSize', () => {
  it('reads a bedroom count, with 0 for a 1 RK', () => {
    expect(parseShortlistSize('2')).toBe(2);
    expect(parseShortlistSize('0')).toBe(0);
  });

  it('ignores anything that is not a plausible bedroom count', () => {
    for (const value of [undefined, '', 'two', '-1', '2.5', ' 2', '11', '100']) {
      expect(parseShortlistSize(value)).toBeNull();
    }
  });
});

describe('shortlistSizeHref', () => {
  it('links to one size, or back to the whole shortlist', () => {
    expect(shortlistSizeHref(3)).toBe('/shortlist?bedrooms=3');
    expect(shortlistSizeHref(0)).toBe('/shortlist?bedrooms=0');
    expect(shortlistSizeHref(null)).toBe('/shortlist');
  });
});
