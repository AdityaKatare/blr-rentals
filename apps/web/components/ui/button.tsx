import type { ComponentProps } from 'react';

export type ButtonVariant = 'solid' | 'outline' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 border leading-none transition-colors disabled:pointer-events-none disabled:opacity-40';

const VARIANTS: Record<ButtonVariant, string> = {
  solid: 'border-ink bg-ink text-paper hover:bg-second',
  outline: 'border-ink bg-sheet text-ink hover:bg-shade',
  quiet: 'border-rule bg-transparent text-ink hover:border-ink',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-2.5 py-1.5 text-[13px] lg:min-h-8',
  md: 'min-h-11 px-3 py-2.5 text-[13px] lg:min-h-9 lg:py-2',
  lg: 'min-h-11 px-4 py-2.5 text-[14px]',
};

export function buttonClass(variant: ButtonVariant = 'outline', size: ButtonSize = 'md', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'outline', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
