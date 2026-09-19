import type { CheckboxProps } from './checkbox';

export function ToggleChip({ name, value, label, checked }: CheckboxProps) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="peer sr-only focus-visible:outline-none" />
      <span className="inline-flex min-h-10 items-center border border-ink bg-sheet px-2 text-[13px] leading-none whitespace-nowrap hover:bg-shade peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink lg:min-h-8">
        {label}
      </span>
    </label>
  );
}
