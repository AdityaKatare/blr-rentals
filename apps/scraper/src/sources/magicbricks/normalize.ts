import type { NormalizedListing } from '@blr/core';
import { NotImplementedError } from '../../errors';
import type { NormalizeContext, RawListing } from '../types';

export function normalizeMagicbricks(_raw: RawListing, _ctx: NormalizeContext): NormalizedListing {
  throw new NotImplementedError('magicbricks.normalize', 'M3');
}
