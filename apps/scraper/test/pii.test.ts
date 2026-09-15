import { describe, expect, it } from 'vitest';
import { isPiiKey, redactContactText, stripPii } from '../src/sources/pii';

describe('stripPii', () => {
  it('removes poster identity keys from every source shape but keeps listing data', () => {
    const raw = {
      id: 'abc',
      rent: 25000,
      latitude: 12.93,
      ownerName: 'Someone',
      ownerId: 'ff80',
      oname: 'V S',
      contName: 'G S',
      companyname: 'Agency',
      CONTACT_NAME: 'Dealer',
      sellers: [{ name: 'x', phone: '9876543210' }],
      ownerListingBadge: true,
      contactedStatusDetails: { contacted: false },
      nested: { photos: [{ url: 'https://img/1.jpg' }], mobile: '9876543210' },
    };
    const out = stripPii(raw) as Record<string, unknown>;
    expect(out).toEqual({
      id: 'abc',
      rent: 25000,
      latitude: 12.93,
      ownerListingBadge: true,
      contactedStatusDetails: { contacted: false },
      nested: { photos: [{ url: 'https://img/1.jpg' }] },
    });
  });

  it('redacts phone numbers and emails inside free text', () => {
    expect(redactContactText('Call 9876543210 or +91 98765 43210 or mail me@x.in')).toBe(
      'Call [phone redacted] or +91 98765 43210 or mail [email redacted]',
    );
    expect(stripPii({ description: 'contact 9123456789 today' })).toEqual({ description: 'contact [phone redacted] today' });
    expect(redactContactText('call 9876543210. or 9876543210, or (+919876543210)')).toBe(
      'call [phone redacted]. or [phone redacted], or ([phone redacted])',
    );
  });

  it('leaves identifiers, coordinates and URLs that merely contain ten digits alone', () => {
    const raw = {
      id: 'ff808181604edd6501604f6789012345',
      location: '12.927597704199984000,77.637387139876543210',
      detailUrl: '/property/2-bhk-for-rent/ff808181604edd6501604f6789012345/detail',
      photo: 'https://img.example.com/Photo_h470_w1080/8313_1789123456.10411_470_1080.jpg',
      ref: 'LISTING_9876543210',
    };
    expect(stripPii(raw)).toEqual(raw);
  });

  it('matches keys case-insensitively and leaves lookalikes alone', () => {
    expect(isPiiKey('OWNER_NAME')).toBe(true);
    expect(isPiiKey('ownerName')).toBe(true);
    expect(isPiiKey('DEALER_PHOTO_URL')).toBe(true);
    expect(isPiiKey('dealerPhotoUrl')).toBe(true);
    expect(isPiiKey('isPaidUser')).toBe(false);
  });
});
