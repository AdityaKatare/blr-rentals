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
  });

  it('matches keys case-insensitively and leaves lookalikes alone', () => {
    expect(isPiiKey('OWNER_NAME')).toBe(true); // underscores ignored: 99acres uses CONTACT_NAME
    expect(isPiiKey('ownerName')).toBe(true);
    expect(isPiiKey('DEALER_PHOTO_URL')).toBe(true);
    expect(isPiiKey('dealerPhotoUrl')).toBe(true);
    expect(isPiiKey('isPaidUser')).toBe(false);
  });
});
