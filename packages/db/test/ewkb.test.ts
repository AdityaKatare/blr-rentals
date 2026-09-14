import { describe, expect, it } from 'vitest';
import { parseEwkbPoint, toEwkbHex } from '../src/ewkb';

describe('EWKB point parsing', () => {
  it('round-trips a Bengaluru point with SRID', () => {
    const p = { lat: 12.9351929, lng: 77.6244807 };
    const hex = toEwkbHex(p);
    expect(hex.startsWith('0101000020E6100000')).toBe(true);
    expect(parseEwkbPoint(hex)).toEqual(p);
  });

  it('parses a point without SRID and big-endian byte order', () => {
    const buf = Buffer.alloc(21);
    buf.writeUInt8(0, 0); // big-endian
    buf.writeUInt32BE(1, 1); // Point, no SRID flag
    buf.writeDoubleBE(77.5, 5);
    buf.writeDoubleBE(12.5, 13);
    expect(parseEwkbPoint(buf.toString('hex'))).toEqual({ lng: 77.5, lat: 12.5 });
  });

  it('rejects non-point geometries and garbage', () => {
    const buf = Buffer.alloc(25);
    buf.writeUInt8(1, 0);
    buf.writeUInt32LE(2 | 0x20000000, 1); // LineString with SRID
    expect(() => parseEwkbPoint(buf.toString('hex'))).toThrow(/Point/);
    expect(() => parseEwkbPoint('nope')).toThrow(/EWKB/);
  });
});
