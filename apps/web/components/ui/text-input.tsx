import type { InputHTMLAttributes } from 'react';

export const INPUT_CLASS =
  'min-h-11 w-full border border-ink bg-sheet px-2.5 py-2 text-[13px] text-ink placeholder:text-muted lg:min-h-9';

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASS} ${className}`} {...props} />;
}
