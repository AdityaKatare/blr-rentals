import type { InputHTMLAttributes } from 'react';

export const INPUT_CLASS =
  'min-h-10 w-full border border-ink bg-sheet px-2 py-1 text-[13px] text-ink placeholder:text-muted lg:min-h-8';

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASS} ${className}`} {...props} />;
}
