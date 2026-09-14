import { describe, expect, it } from 'vitest';
import { extractInlineJson } from '../src/sources/inline-json';

const PAGE = `<html><script>
  window.nb = window.nb || {};
  nb.pageName = "listPage";
  nb.appState = {"route":{"location":null},"list":[{"id":"a1","title":"2 BHK {braces} in \\"quotes\\"","rent":25000},{"id":"b2","rent":30000}],"count":2};
  window.other = [1, 2, 3];
</script></html>`;

describe('extractInlineJson', () => {
  it('extracts an object after a regex marker, ignoring braces inside strings', () => {
    const state = extractInlineJson(PAGE, /nb\.appState\s*=\s*/) as { list: Array<{ id: string; rent: number }>; count: number };
    expect(state.count).toBe(2);
    expect(state.list.map((l) => l.id)).toEqual(['a1', 'b2']);
    expect(state.list[0]?.rent).toBe(25000);
  });

  it('extracts an array after a string marker', () => {
    expect(extractInlineJson(PAGE, 'window.other =')).toEqual([1, 2, 3]);
  });

  it('fails loudly when the marker is missing or the JSON is unterminated', () => {
    expect(() => extractInlineJson(PAGE, 'window.missing =')).toThrow(/marker not found/);
    expect(() => extractInlineJson('x = {"a": [1, 2', 'x =')).toThrow(/unterminated/);
    expect(() => extractInlineJson('x = "str"', 'x =')).toThrow(/expected/);
  });
});
