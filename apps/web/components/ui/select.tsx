import type { ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  name: string;
  label: string;
  defaultValue: string;
  options: SelectOption[];
  title?: string;
  hideLabel?: boolean;
}

const NATIVE = 'appearance-none bg-transparent pr-5 text-[13px] leading-none text-ink focus:outline-none';

export function Select({ name, label, defaultValue, options, title, hideLabel = false }: SelectProps) {
  return (
    <label
      title={title}
      className="relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 border border-ink bg-sheet py-1 pl-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink hover:bg-shade lg:min-h-8"
    >
      <span className={hideLabel ? 'sr-only' : 'label'}>{label}</span>
      <select name={name} defaultValue={defaultValue} className={NATIVE}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Caret />
    </label>
  );
}

export function Caret({ className = '' }: { className?: string }): ReactNode {
  return (
    <span aria-hidden className={`pointer-events-none absolute right-1.5 text-[9px] leading-none ${className}`}>
      ▾
    </span>
  );
}
