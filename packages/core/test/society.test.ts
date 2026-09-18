import { describe, expect, it } from 'vitest';
import { societySlug } from '../src/society';

describe('societySlug', () => {
  it('matches the slug Postgres generates for a society name', () => {
    expect(societySlug('L&T Raintree Boulevard')).toBe('l-t-raintree-boulevard');
    expect(societySlug('Eden Park At The Prestige City')).toBe('eden-park-at-the-prestige-city');
    expect(societySlug('  Valmark Aastha, ')).toBe('valmark-aastha');
    expect(societySlug('SOBHA Dream Gardens')).toBe('sobha-dream-gardens');
  });

  it('folds spelling variants that differ only in case or punctuation', () => {
    expect(societySlug('Assetz Here and Now')).toBe(societySlug('Assetz Here And Now'));
    expect(societySlug('jsj  opal')).toBe(societySlug('JSJ Opal'));
  });

  it('is null when nothing survives slugifying', () => {
    expect(societySlug('   ')).toBeNull();
    expect(societySlug('!!!')).toBeNull();
  });
});
