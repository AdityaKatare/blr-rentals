/**
 * Poster identity and contact data never reach the database. Adapters call
 * stripPii() on every raw listing before normalising; the pipeline stores
 * only what comes back.
 */
const PII_KEY =
  /^(owner(name|id|phone|mobile|email)?|contact(name|number|no|person)?|phone|mobile|mobileno|email|emailid|company|companyname|oname|contname|cont_name|sellers?|seller(name|id)?|dealer(name|photourl|id)?|agent(name|id)?|postedby(name)?|smouuid|pemailuuid|psmmd|whatsapp|whatsappnumber)$/i;

const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{9}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export const isPiiKey = (key: string): boolean => PII_KEY.test(key.replace(/_/g, ''));

export function redactContactText(text: string): string {
  return text.replace(PHONE, '[phone redacted]').replace(EMAIL, '[email redacted]');
}

export function stripPii<T>(value: T): T {
  if (typeof value === 'string') return redactContactText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => stripPii(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isPiiKey(k)) continue;
      out[k] = stripPii(v);
    }
    return out as T;
  }
  return value;
}
