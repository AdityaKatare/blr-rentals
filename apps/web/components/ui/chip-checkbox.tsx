import type { CheckboxProps } from './checkbox';

export function ChipCheckbox({ name, value, label, checked }: CheckboxProps) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-zinc-300 px-3 py-1 text-sm peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400">
        {label}
      </span>
    </label>
  );
}
