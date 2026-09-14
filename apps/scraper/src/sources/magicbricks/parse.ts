import { NotImplementedError } from '../../errors';
import type { ParsedPage } from '../types';

export const MAGICBRICKS_STATE_MARKER = /window\.SERVER_PRELOADED_STATE_\s*=\s*/;

/**
 * TODO(M3):
 *  1. `const state = extractInlineJson(body, MAGICBRICKS_STATE_MARKER)`.
 *  2. `state.searchResult` is the 30-item listing array;
 *     `state.searchAdditionalDataBean.resultCount` / `.maxOffset` give total and page count;
 *     `state.searchBean.pageNo` echoes the current page.
 *  3. Capture `state.constantDataBean` once to build the code → label tables
 *     for `bd` (BHK), `ty` (property type) and `furnished`.
 *  4. Return `{ raw: searchResult.map(stripPii), hasNext: pageNo < maxOffset, total }`.
 */
export function parseMagicbricksSearchPage(_body: string, _url: string): ParsedPage {
  throw new NotImplementedError('magicbricks.parseSearchPage', 'M3');
}
