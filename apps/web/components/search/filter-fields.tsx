import {
  AMENITIES,
  DEPOSIT_MONTHS_OPTIONS,
  FURNISHINGS,
  NEAR_METRO_OPTIONS_M,
  PROPERTY_TYPES,
  SOURCE_SLUGS,
  TENANT_FILTERS,
} from '@blr/core';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { PopoverFilter } from '@/components/ui/popover-filter';
import { Select } from '@/components/ui/select';
import { TextInput } from '@/components/ui/text-input';
import { ToggleChip } from '@/components/ui/toggle-chip';
import {
  FURNISHING_LABELS,
  NEAR_METRO_LABELS,
  PROPERTY_TYPE_LABELS,
  SOURCE_LABELS,
  TENANT_FILTER_LABELS,
} from '@/constants/labels';
import { BHK_OPTIONS, DEPOSIT_FILTER_NOTE, METRO_FILTER_NOTE } from '@/constants/search';
import { humanize, shortDate } from '@/utils/format';
import { first, list, type Params, type ParsedParams } from '@/utils/search-params';

interface FilterFieldsProps {
  params: Params;
  parsed: ParsedParams;
}

export function FilterFields({ params, parsed }: FilterFieldsProps) {
  const bedrooms = list(params.bedrooms);
  const furnishing = list(params.furnishing);
  const propertyTypes = list(params.propertyTypes);
  const amenities = list(params.amenities);
  const sources = list(params.sources);
  const availableBy = first(params.availableBy) ?? '';

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-3">
        <Group label="Rent">
          <TextInput
            name="minRent"
            type="number"
            min={0}
            step={1000}
            placeholder="Min"
            aria-label="Minimum rent per month"
            defaultValue={first(params.minRent) ?? ''}
            className="w-full lg:w-24"
          />
          <span aria-hidden className="text-muted">
            –
          </span>
          <TextInput
            name="maxRent"
            type="number"
            min={0}
            step={1000}
            placeholder="Max"
            aria-label="Maximum rent per month"
            defaultValue={first(params.maxRent) ?? ''}
            className="w-full lg:w-24"
          />
        </Group>

        <Group label="Size">
          {BHK_OPTIONS.map((o) => (
            <ToggleChip key={o.value} name="bedrooms" value={o.value} label={o.label} checked={bedrooms.includes(o.value)} />
          ))}
        </Group>

        <Group label="Furnishing">
          {FURNISHINGS.filter((f) => f !== 'unknown').map((f) => (
            <ToggleChip
              key={f}
              name="furnishing"
              value={f}
              label={FURNISHING_LABELS[f] ?? f}
              checked={furnishing.includes(f)}
            />
          ))}
        </Group>

        <a
          href="/"
          className="label self-start underline underline-offset-4 hover:text-warn lg:ml-auto lg:self-auto"
        >
          Reset all filters
        </a>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:border-t lg:border-hair lg:pt-3">
        <PopoverFilter label="Type" summary={propertyTypes.length ? String(propertyTypes.length) : null}>
          <div className="grid grid-cols-2 gap-x-4">
            {PROPERTY_TYPES.filter((t) => t !== 'other').map((t) => (
              <Checkbox
                key={t}
                name="propertyTypes"
                value={t}
                label={PROPERTY_TYPE_LABELS[t] ?? t}
                checked={propertyTypes.includes(t)}
              />
            ))}
          </div>
        </PopoverFilter>

        <Select
          name="tenants"
          label="Tenants"
          defaultValue={parsed.query.tenantPreference ?? ''}
          options={[{ value: '', label: 'Anyone' }, ...TENANT_FILTERS.map((t) => ({ value: t, label: TENANT_FILTER_LABELS[t] }))]}
        />

        <Select
          name="depositMonths"
          label="Deposit"
          title={DEPOSIT_FILTER_NOTE}
          defaultValue={parsed.query.depositMaxMonths ? String(parsed.query.depositMaxMonths) : ''}
          options={[
            { value: '', label: 'Any size' },
            ...DEPOSIT_MONTHS_OPTIONS.map((m) => ({ value: String(m), label: `Up to ${m} ${m === 1 ? 'month' : 'months'}` })),
          ]}
        />

        <Select
          name="nearMetro"
          label="Metro"
          title={METRO_FILTER_NOTE}
          defaultValue={parsed.query.nearMetroM ? String(parsed.query.nearMetroM) : ''}
          options={[
            { value: '', label: 'Any distance' },
            ...NEAR_METRO_OPTIONS_M.map((m) => ({ value: String(m), label: `Within ${NEAR_METRO_LABELS[m]}` })),
          ]}
        />

        <PopoverFilter label="Available by" summary={availableBy ? shortDate(availableBy) ?? availableBy : null} width="lg:w-56">
          <TextInput name="availableBy" type="date" aria-label="Available by" defaultValue={availableBy} />
        </PopoverFilter>

        <div className="flex flex-wrap gap-2">
          <ToggleChip name="parking" value="required" label="Parking" checked={first(params.parking) === 'required'} />
          <ToggleChip name="ownerOnly" value="on" label="Owner only" checked={first(params.ownerOnly) === 'on'} />
        </div>

        <PopoverFilter
          label="Amenities"
          summary={amenities.length ? String(amenities.length) : null}
          width="lg:w-[22rem]"
          note="A listing must have every amenity you tick."
        >
          <div className="grid grid-cols-2 gap-x-4">
            {AMENITIES.map((a) => (
              <Checkbox key={a} name="amenities" value={a} label={humanize(a)} checked={amenities.includes(a)} />
            ))}
          </div>
        </PopoverFilter>

        <PopoverFilter label="Sources" summary={sources.length ? String(sources.length) : null} width="lg:w-56">
          <div className="grid grid-cols-1 gap-x-4">
            {SOURCE_SLUGS.map((s) => (
              <Checkbox key={s} name="sources" value={s} label={SOURCE_LABELS[s] ?? s} checked={sources.includes(s)} />
            ))}
          </div>
        </PopoverFilter>

        <span className="label hidden lg:ml-auto lg:inline" aria-live="polite">
          Applies as you change
        </span>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
