import { describe, expect, it } from 'vitest';
import { buildPoiRows, osmRules, overpassQuery, ringAreaM2, type OsmElement } from '../src/pois/osm';

const square = (lat: number, lon: number, halfDeg: number) => [
  { lat: lat - halfDeg, lon: lon - halfDeg },
  { lat: lat - halfDeg, lon: lon + halfDeg },
  { lat: lat + halfDeg, lon: lon + halfDeg },
  { lat: lat + halfDeg, lon: lon - halfDeg },
  { lat: lat - halfDeg, lon: lon - halfDeg },
];

describe('overpassQuery', () => {
  it('asks for every rule by element type inside the box', () => {
    const q = overpassQuery(osmRules(), [12.7, 77.35, 13.25, 77.9]);
    expect(q).toContain('node["amenity"="hospital"](12.7,77.35,13.25,77.9);');
    expect(q).toContain('way["highway"~"^(motorway|trunk|primary)$"](12.7,77.35,13.25,77.9);');
    expect(q).toContain('node["railway"="station"]["station"!~"^(subway|light_rail|monorail)$"]');
    expect(q).toContain('["name"~"tech ?park|');
    expect(q).not.toContain('node["highway"~"^(motorway');
    expect(q).toContain('.w out geom;');
  });

  it('adds city-specific tech park names from the overrides', () => {
    expect(overpassQuery(osmRules({ extraNamePatterns: { tech_park: ['manyata'] } }), [0, 0, 1, 1])).toContain('|manyata"');
  });
});

describe('buildPoiRows', () => {
  const elements: OsmElement[] = [
    { type: 'node', id: 1, lat: 12.9, lon: 77.6, tags: { amenity: 'hospital', name: 'City Hospital' } },
    { type: 'node', id: 2, lat: 12.91, lon: 77.61, tags: { highway: 'bus_stop' } },
    { type: 'node', id: 3, lat: 12.97, lon: 77.57, tags: { railway: 'station', station: 'subway', name: 'Majestic' } },
    { type: 'node', id: 4, lat: 12.98, lon: 77.57, tags: { railway: 'station', name: 'KSR Bengaluru' } },
    {
      type: 'way',
      id: 10,
      geometry: square(13.04, 77.62, 0.003),
      tags: { landuse: 'commercial', name: 'Manyata Tech Park' },
    },
    { type: 'way', id: 11, geometry: square(13.045, 77.625, 0.002), tags: { building: 'yes', name: 'Manyata Tech Park' } },
    { type: 'way', id: 12, geometry: square(12.9, 77.6, 0.0002), tags: { building: 'yes', name: 'Tiny Tech Park' } },
    { type: 'way', id: 13, geometry: square(12.95, 77.7, 0.003), tags: { landuse: 'residential', name: 'Tech Park Homes' } },
    {
      type: 'way',
      id: 20,
      geometry: [
        { lat: 12.9, lon: 77.6 },
        { lat: 12.91, lon: 77.61 },
      ],
      tags: { highway: 'trunk', name: 'Outer Ring Road' },
    },
    { type: 'relation', id: 30, center: { lat: 13.2, lon: 77.7 }, tags: { aeroway: 'aerodrome', iata: 'BLR', name: 'KIA' } },
    { type: 'node', id: 31, lat: 13.1, lon: 77.6, tags: { aeroway: 'aerodrome', name: 'Private strip' } },
    { type: 'node', id: 40, lat: 12.9, lon: 77.6, tags: { amenity: 'cafe', name: 'Excluded Cafe' } },
  ];

  const rows = buildPoiRows(elements, { exclude: ['node/40'], rename: { 'node/4': 'Bengaluru City Junction' } });
  const of = (category: string) => rows.filter((r) => r.category === category);

  it('classifies elements by tag and keeps unnamed stops', () => {
    expect(of('hospital').map((r) => r.name)).toEqual(['City Hospital']);
    expect(of('bus_stop')).toEqual([expect.objectContaining({ name: null, sourceRef: 'node/2' })]);
    expect(of('airport').map((r) => r.sourceRef)).toEqual(['relation/30']);
    expect(of('restaurant')).toEqual([]);
  });

  it('leaves metro to the metro table and applies renames', () => {
    expect(of('railway_station').map((r) => r.name)).toEqual(['Bengaluru City Junction']);
  });

  it('keeps roads as lines and campuses as polygons, merging parts of one campus', () => {
    expect(of('major_road')[0]!.geometry.type).toBe('LineString');
    const parks = of('tech_park');
    expect(parks).toHaveLength(1);
    expect(parks[0]!.sourceRef).toBe('way/10,way/11');
    expect(parks[0]!.geometry).toMatchObject({ type: 'GeometryCollection' });
    expect((parks[0]!.geometry as { geometries: unknown[] }).geometries).toHaveLength(2);
  });

  it('measures polygon area well enough to drop tiny buildings', () => {
    const ring = square(12.9, 77.6, 0.0045).map((p) => [p.lon, p.lat] as [number, number]);
    expect(ringAreaM2(ring)).toBeGreaterThan(900_000);
    expect(ringAreaM2(ring)).toBeLessThan(1_050_000);
  });
});
