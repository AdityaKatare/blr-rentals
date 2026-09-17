export const DAY_MS = 86_400_000;
export const IST_OFFSET_MS = 5.5 * 3_600_000;

export function istDate(epochMs: number): string {
  return new Date(epochMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}
