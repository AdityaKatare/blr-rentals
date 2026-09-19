import { SORT_OPTIONS, type SortOption } from '@blr/core';
import { Select } from '@/components/ui/select';
import { SORT_LABELS } from '@/constants/labels';

export function SortSelect({ value }: { value: SortOption }) {
  return (
    <Select
      name="sort"
      label="Sort"
      labelClassName="label max-sm:sr-only"
      defaultValue={value}
      options={SORT_OPTIONS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
    />
  );
}
