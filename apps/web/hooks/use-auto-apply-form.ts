'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';

const TYPING_DELAY_MS = 600;
const TYPED_INPUTS = new Set(['text', 'number', 'search']);

export function useAutoApplyForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(qs);
  const lastApplied = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (qs !== lastApplied.current) setFormKey(qs);
  }, [qs]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply(form: HTMLFormElement) {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim() !== '') params.append(key, value.trim());
    }
    const next = params.toString();
    if (next === qs) return;
    lastApplied.current = next;
    startTransition(() => router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  function onInput(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (target instanceof HTMLInputElement && target.name === 'locality') {
      if (target.value.trim() !== '') clearFields(form, ['lat', 'lng']);
      const inputType = (e.nativeEvent as InputEvent).inputType;
      if (inputType === undefined || inputType === 'insertReplacementText') apply(form);
      return;
    }
    if (target instanceof HTMLInputElement && TYPED_INPUTS.has(target.type)) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => apply(form), TYPING_DELAY_MS);
      return;
    }
    apply(form);
  }

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'checkbox') {
      e.preventDefault();
      apply(e.currentTarget);
    }
  }

  function onBlur(e: FocusEvent<HTMLFormElement>) {
    if (e.target instanceof HTMLInputElement && e.target.name === 'locality') apply(e.currentTarget);
  }

  return { formKey, pending, apply, formHandlers: { onInput, onKeyDown, onBlur } };
}

function clearFields(form: HTMLFormElement, names: string[]): void {
  for (const name of names) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.value = '';
  }
}
