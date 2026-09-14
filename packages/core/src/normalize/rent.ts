/**
 * Parse Indian rupee amounts as they appear on portals into integer rupees.
 *   95000 · "95,000" · "₹ 95,000" · "Rs. 25k" · "1.2 Lac" · "70,000/month" → number
 * Returns null for anything unparseable or non-positive.
 */
export function parseRupees(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? Math.round(input) : null;
  }
  if (typeof input !== 'string') return null;

  const s = input
    .toLowerCase()
    .replace(/[₹,\s]/g, '')
    .replace(/^(rs\.?|inr)/, '')
    .replace(/(\/month|\/mo|permonth|pm|p\.m\.)$/, '');

  const m = /^(\d+(?:\.\d+)?)(k|l|lac|lacs|lakh|lakhs|cr|crore|crores)?$/.exec(s);
  if (!m) return null;
  const [, num, unit = ''] = m;
  if (!num) return null;

  const multiplier = unit === 'k' ? 1e3 : unit.startsWith('l') ? 1e5 : unit.startsWith('cr') ? 1e7 : 1;
  const value = Math.round(parseFloat(num) * multiplier);
  return value > 0 ? value : null;
}
