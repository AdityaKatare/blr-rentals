export interface CheckboxProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}

export function Checkbox({ name, value, label, checked }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px] leading-tight lg:py-1">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-3.5 w-3.5 shrink-0 appearance-none border border-ink bg-sheet checked:bg-ink"
      />
      {label}
    </label>
  );
}
