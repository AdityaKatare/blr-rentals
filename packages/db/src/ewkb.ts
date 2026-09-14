import type { LatLng } from '@blr/core';

const SRID_FLAG = 0x20000000;
const TYPE_MASK = 0x0fffffff;
const POINT = 1;

/**
 * Parse the EWKB hex string PostGIS returns for a `geography(Point)` column
 * (e.g. `0101000020E6100000<lng f64><lat f64>`) into { lat, lng }.
 */
export function parseEwkbPoint(hex: string): LatLng {
  if (typeof hex !== 'string' || hex.length < 42) {
    throw new Error(`Not an EWKB point: ${String(hex).slice(0, 40)}`);
  }
  const buf = Buffer.from(hex, 'hex');
  const little = buf[0] === 1;
  const read32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const readF64 = (o: number) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o));

  const type = read32(1);
  if ((type & TYPE_MASK) !== POINT) {
    throw new Error(`Expected Point geometry, got WKB type ${type & TYPE_MASK}`);
  }
  const offset = 5 + ((type & SRID_FLAG) !== 0 ? 4 : 0);
  return { lng: readF64(offset), lat: readF64(offset + 8) };
}

/** Inverse of parseEwkbPoint (little-endian, with SRID). Used in tests and seeds. */
export function toEwkbHex(p: LatLng, srid = 4326): string {
  const buf = Buffer.alloc(25);
  buf.writeUInt8(1, 0);
  buf.writeUInt32LE(POINT | SRID_FLAG, 1);
  buf.writeUInt32LE(srid, 5);
  buf.writeDoubleLE(p.lng, 9);
  buf.writeDoubleLE(p.lat, 17);
  return buf.toString('hex').toUpperCase();
}
