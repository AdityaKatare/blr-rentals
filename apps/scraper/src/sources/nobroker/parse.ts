import { NotImplementedError } from '../../errors';
import type { ParsedPage } from '../types';

export const NOBROKER_STATE_MARKER = /nb\.appState\s*=\s*/;

/**
 * TODO(M2):
 *  1. `const state = extractInlineJson(body, NOBROKER_STATE_MARKER)`.
 *  2. Locate the listing array (verified present on 2026-09-13: ~26 objects
 *     carrying `rent`, `deposit`, `latitude`, `propertyType`, plus a "nearby"
 *     carousel that must be excluded).
 *  3. Return `{ raw: listings.map(stripPii), hasNext, total }` where `total`
 *     comes from the same state (API equivalent: `otherParams.total_count`).
 *  4. Capture a scrubbed fixture under __fixtures__/ and test this function
 *     against it; the fixture is the schema-drift canary.
 */
export function parseNobrokerSearchPage(_body: string, _url: string): ParsedPage {
  throw new NotImplementedError('nobroker.parseSearchPage', 'M2');
}
