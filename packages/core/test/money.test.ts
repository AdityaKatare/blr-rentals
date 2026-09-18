import { describe, expect, it } from 'vitest';
import { depositMonths, moveInCost } from '../src/money';

describe('depositMonths', () => {
  it('rounds to the nearest half month', () => {
    expect(depositMonths(30000, 150000)).toBe(5);
    expect(depositMonths(30000, 75000)).toBe(2.5);
    expect(depositMonths(30000, 70000)).toBe(2.5);
    expect(depositMonths(30000, 60001)).toBe(2);
  });

  it('is null without a usable deposit', () => {
    expect(depositMonths(30000, null)).toBeNull();
    expect(depositMonths(30000, 0)).toBeNull();
  });

  it('refuses deposits the portals clearly got wrong', () => {
    expect(depositMonths(300000, 1)).toBeNull();
    expect(depositMonths(30000, 10000)).toBeNull();
    expect(depositMonths(30000, 600000)).toBeNull();
    expect(depositMonths(30000, 15000)).toBe(0.5);
  });
});

describe('moveInCost', () => {
  it('adds deposit and maintenance to the first month', () => {
    expect(moveInCost({ rent: 30000, deposit: 150000, maintenance: 2000, listedBy: 'owner' })).toEqual({
      total: 182000,
      rent: 30000,
      deposit: 150000,
      maintenance: 2000,
      brokerage: 0,
    });
  });

  it('counts one month of brokerage on brokered listings', () => {
    const cost = moveInCost({ rent: 30000, deposit: 150000, maintenance: null, listedBy: 'broker' });
    expect(cost).toMatchObject({ brokerage: 30000, maintenance: 0, total: 210000 });
  });

  it('is null when the deposit is unknown or implausible, because the total would be a guess', () => {
    expect(moveInCost({ rent: 30000, deposit: null, maintenance: 2000, listedBy: 'owner' })).toBeNull();
    expect(moveInCost({ rent: 300000, deposit: 1, maintenance: null, listedBy: 'owner' })).toBeNull();
  });
});
