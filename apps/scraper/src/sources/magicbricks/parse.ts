import { NotImplementedError } from '../../errors';
import type { ParsedPage } from '../types';

export const MAGICBRICKS_STATE_MARKER = /window\.SERVER_PRELOADED_STATE_\s*=\s*/;

export function parseMagicbricksSearchPage(_body: string, _url: string): ParsedPage {
  throw new NotImplementedError('magicbricks.parseSearchPage', 'M3');
}
