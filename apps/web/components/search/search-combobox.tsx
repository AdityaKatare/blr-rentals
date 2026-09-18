'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { INPUT_CLASS } from '@/components/ui/text-input';

export interface ComboOption {
  value: string;
  hint?: string | null;
}

interface SearchComboboxProps {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
  options: ComboOption[];
  clearFields?: string[];
  limit?: number;
  inputClassName?: string;
  wrapperClassName?: string;
  autoSize?: boolean;
}

const SUGGESTION_LIMIT = 10;
const BROWSE_LIMIT = 50;

function rank(option: ComboOption, q: string): number {
  const value = option.value.toLowerCase();
  const hints = (option.hint ?? '').toLowerCase().split(', ').filter(Boolean);
  if (value === q || hints.includes(q)) return 0;
  if (value.startsWith(q)) return 1;
  if (hints.some((h) => h.startsWith(q))) return 2;
  if (value.includes(q)) return 3;
  if (hints.some((h) => h.includes(q))) return 4;
  return -1;
}

function setField(form: HTMLFormElement, name: string, value: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.value = value;
}

export function SearchCombobox({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  options,
  clearFields = [],
  limit = SUGGESTION_LIMIT,
  inputClassName = INPUT_CLASS,
  wrapperClassName = 'relative',
  autoSize = false,
}: SearchComboboxProps) {
  const listId = `${useId()}-list`;
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!typing || !q) return options.slice(0, BROWSE_LIMIT);
    return options
      .map((option) => ({ option, score: rank(option, q) }))
      .filter((m) => m.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map((m) => m.option);
  }, [options, value, typing, limit]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  const show = () => {
    setOpen(true);
    setTyping(false);
    setActive(matches.findIndex((o) => o.value.toLowerCase() === value.trim().toLowerCase()));
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (picked: string) => {
    setValue(picked);
    close();
    setTyping(false);
    const form = input.current?.form;
    if (!form) return;
    setField(form, name, picked);
    for (const field of clearFields) setField(form, field, '');
    form.requestSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        show();
        return;
      }
      if (matches.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + matches.length) % matches.length);
      return;
    }
    if (e.key === 'Enter' && open && active >= 0 && matches[active]) {
      e.preventDefault();
      e.stopPropagation();
      choose(matches[active].value);
      return;
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className={wrapperClassName}>
      <input
        ref={input}
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        size={autoSize ? Math.max(placeholder.length, value.length + 1) : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setTyping(true);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={show}
        onPointerDown={show}
        onBlur={close}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 max-h-72 w-max min-w-full max-w-[min(90vw,26rem)] overflow-y-auto overscroll-contain border border-ink bg-sheet font-sans text-[13px] font-normal tracking-normal text-ink shadow-sheet"
        >
          {matches.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(option.value);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${
                i === active ? 'bg-ink text-paper' : ''
              }`}
            >
              <span className="truncate">{option.value}</span>
              {option.hint && (
                <span className={`shrink-0 font-mono text-[11px] ${i === active ? 'text-paper/70' : 'text-muted'}`}>{option.hint}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
