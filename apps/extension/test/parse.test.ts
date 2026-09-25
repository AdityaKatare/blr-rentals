import { describe, expect, it } from 'vitest';
import { parseListingUrl } from '../src/parse';

describe('parseListingUrl', () => {
  it('reads the NoBroker id from a detail page URL', () => {
    expect(
      parseListingUrl(
        'https://www.nobroker.in/property/2-bhk-apartment-for-rent-in-krishnanagar-apartment-complex-bangalore-for-rs-30000/8A9FA782825ECF1201825F13BEF627E2/detail',
      ),
    ).toEqual({ source: 'nobroker', id: '8a9fa782825ecf1201825f13bef627e2' });
  });

  it('keeps the NoBroker id when the URL has a query or hash', () => {
    expect(parseListingUrl('https://www.nobroker.in/property/x/8a9fa782825ecf1201825f13bef627e2/detail?utm=1#photos')?.id).toBe(
      '8a9fa782825ecf1201825f13bef627e2',
    );
  });

  it('ignores NoBroker search pages', () => {
    expect(parseListingUrl('https://www.nobroker.in/property/rent/bangalore/Koramangala')).toBeNull();
  });

  it('decodes the hex MagicBricks id and strips the MB prefix', () => {
    expect(
      parseListingUrl(
        'https://www.magicbricks.com/propertyDetails/2-BHK-1075-Sq-ft-Multistorey-Apartment-FOR-Rent-HSR-Layout-in-Bangalore&id=4d423531343931303538',
      ),
    ).toEqual({ source: 'magicbricks', id: '51491058' });
  });

  it('returns null for MagicBricks pages without an id', () => {
    expect(parseListingUrl('https://www.magicbricks.com/propertyDetails/some-flat-in-Bangalore')).toBeNull();
    expect(parseListingUrl('https://www.magicbricks.com/property-for-rent-in-bangalore-pppfr')).toBeNull();
  });

  it('returns null for other hosts and garbage', () => {
    expect(parseListingUrl('https://housing.com/rent/8a9fa782825ecf1201825f13bef627e2/detail')).toBeNull();
    expect(parseListingUrl('not a url')).toBeNull();
  });
});
