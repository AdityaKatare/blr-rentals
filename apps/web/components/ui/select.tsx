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

const NATIVE = 'appearance-none bg-transparent pr-4 text-[13px] leading-none text-ink focus:outline-none';

export function Select({ name, label, defaultValue, options, title, hideLabel = false }: SelectProps) {
  return (
    <label
      title={title}
      className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink bg-sheet px-2.5 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink hover:bg-shade lg:min-h-9"
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
    <span aria-hidden className={`pointer-events-none absolute right-2 text-[10px] leading-none ${className}`}>
      ▾
    </span>
  );
}
