import { describe, expect, it } from 'vitest';
import { placeNames, societyName } from '../src/sources/shared/society';

const places = placeNames([
  { name: 'AECS Layout', aliases: [] },
  { name: 'HSR Layout', aliases: ['hsr'] },
  { name: 'BTM Layout', aliases: ['btm'] },
  { name: 'KR Puram', aliases: ['k r puram', 'krishnarajapuram'] },
  { name: 'Whitefield', aliases: [] },
]);
const clean = (value: string) => societyName(value, places);

describe('societyName', () => {
  it('keeps real societies', () => {
    for (const name of ['Prestige Shantiniketan', 'Godrej Ecity', 'Divyasree Republic of Whitefield', 'Apartment Gardens', 'Danvit 82']) {
      expect(clean(name)).toBe(name);
    }
  });

  it('rejects a locality typed as the society', () => {
    for (const name of ['aecs layout', 'Kr Puram', 'K R Puram', 'Whitefield', 'Project HSR Layout', ' HSR Layout,']) {
      expect(clean(name)).toBeNull();
    }
  });

  it('rejects neighbourhoods, associations and streets', () => {
    for (const name of ['Mig KHB Colony', 'Jcr layout', 'Bellandur Iblur RWA', 'MSRS Nagar Welfare Association', 'govindapura 17 cross', 'DX Max Hennur ring road']) {
      expect(clean(name)).toBeNull();
    }
  });

  it('rejects addresses and every spelling of a standalone building', () => {
    for (const name of ['68, 5th Cross, Vinayak Nagar', 'No-38,5th cross', '3A', 'standalone buidling', 'Stand alone bil', 'Standalone Building (2.5 BHK)']) {
      expect(clean(name)).toBeNull();
    }
  });

  it('drops the locality a name is qualified with', () => {
    expect(clean('Prestige Shantiniketan, Whitefield')).toBe('Prestige Shantiniketan');
    expect(clean('Ahad Silver Park, Hsr Layout, Bengaluru')).toBe('Ahad Silver Park');
    expect(clean('Adarsh Homes BTM Layout')).toBe('Adarsh Homes');
    expect(clean('Garden Residency KR Puram')).toBe('Garden Residency');
    expect(clean('Wild Grass Apartment.')).toBe('Wild Grass Apartment');
  });
});
