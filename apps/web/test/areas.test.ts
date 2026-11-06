import type { SocietyBedroomStat } from '@blr/db';
import { describe, expect, it } from 'vitest';
import { areaDescription, areaRentSummary } from '@/utils/areas';

const stat = (bedrooms: number, rentMedian: number): SocietyBedroomStat => ({
  bedrooms,
  units: 10,
  rentMin: rentMedian - 5000,
  rentMedian,
  rentMax: rentMedian + 5000,
});

describe('areaRentSummary', () => {
  it('leads with the sizes most people search for', () => {
    expect(areaRentSummary([stat(1, 18000), stat(2, 30000), stat(3, 45000), stat(4, 90000)])).toBe(
      'A typical 2 BHK rents for about ₹30,000 a month, and a 3 BHK for about ₹45,000.',
    );
  });

  it('uses a single size when only one is known', () => {
    expect(areaRentSummary([stat(1, 18000)])).toBe('A typical 1 BHK rents for about ₹18,000 a month.');
  });

  it('says nothing when no common size has enough homes', () => {
    expect(areaRentSummary([stat(4, 90000)])).toBeNull();
    expect(areaRentSummary([])).toBeNull();
  });
});

describe('areaDescription', () => {
  it('states the count and a typical rent', () => {
    expect(areaDescription('Koramangala', 1420, [stat(2, 30000)])).toBe(
      '1,420 flats and apartments for rent in Koramangala, Bangalore, from NoBroker, MagicBricks and other portals. Typical 2 BHK rent ₹30,000. See the nearest metro and tech park for every listing.',
    );
  });

  it('drops the numbers for an empty area', () => {
    expect(areaDescription('Peenya', 0, [])).toBe(
      'Flats and apartments for rent in Peenya, Bangalore, from NoBroker, MagicBricks and other portals. See the nearest metro and tech park for every listing.',
    );
  });
});
