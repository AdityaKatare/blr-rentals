import type { MetroLine } from '@blr/core';
import { METRO_LINE_LABELS, METRO_LINE_STYLES } from '@/constants/labels';

export function MetroLinesIcon({ lines }: { lines: MetroLine[] }) {
  return (
    <span className="inline-flex flex-col justify-center gap-[2px] align-middle">
      <span className="sr-only">{lines.map((line) => METRO_LINE_LABELS[line]).join(' and ')}: </span>
      {lines.map((line) => (
        <span key={line} aria-hidden className={`inline-block h-[3px] w-4 rounded-full ${METRO_LINE_STYLES[line]}`} />
      ))}
    </span>
  );
}
