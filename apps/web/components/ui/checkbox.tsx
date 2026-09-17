export interface CheckboxProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}

export function Checkbox({ name, value, label, checked }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="accent-zinc-900" />
      {label}
    </label>
  );
}
