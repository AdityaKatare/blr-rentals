import { describe, expect, it } from 'vitest';
import { activeFilters } from '@/utils/filters';
import { parseNear, parseParams } from '@/utils/search-params';

describe('parseNear', () => {
  it('reads repeated category:metres pairs and drops anything malformed', () => {
    const near = parseNear({ near: ['tech_park:5000', 'hospital:2000', 'casino:1000', 'school:abc', 'gym:50', 'park'] });
    expect(near.map(({ category, withinM }) => ({ category, withinM }))).toEqual([
      { category: 'tech_park', withinM: 5000 },
      { category: 'hospital', withinM: 2000 },
    ]);
  });

  it('keeps the last distance when a category repeats', () => {
    expect(parseNear({ near: ['metro:500', 'metro:1500'] }).map((n) => n.withinM)).toEqual([1500]);
  });

  it('still honours old nearMetro links, letting an explicit metro criterion win', () => {
    expect(parseNear({ nearMetro: '1000' })).toEqual([{ category: 'metro', withinM: 1000, param: 'nearMetro', raw: '1000' }]);
    expect(parseNear({ nearMetro: '1000', near: 'metro:500' }).map((n) => [n.withinM, n.param])).toEqual([[500, 'near']]);
  });

  it('passes the criteria into the search query', () => {
    expect(parseParams({ locality: 'Hebbal', near: ['tech_park:5000'], nearMetro: '500' }).query.near).toEqual([
      { category: 'metro', withinM: 500 },
      { category: 'tech_park', withinM: 5000 },
    ]);
    expect(parseParams({ locality: 'Hebbal' }).query.near).toBeUndefined();
  });
});

describe('nearby filter chips', () => {
  it('labels each criterion and removes only that one', () => {
    const chips = activeFilters({ locality: 'Hebbal', near: ['tech_park:5000', 'restaurant:500'], nearMetro: '1500' });
    const near = chips.filter((c) => c.key.startsWith('near:'));
    expect(near.map((c) => c.label)).toEqual([
      'Metro within 1.5 km',
      'Tech park within 5 km',
      'Restaurant or cafe within 500 m',
    ]);
    expect(near[0]!.href).toBe('/?locality=Hebbal&near=tech_park%3A5000&near=restaurant%3A500');
    expect(near[1]!.href).toBe('/?locality=Hebbal&near=restaurant%3A500&nearMetro=1500');
  });
});
