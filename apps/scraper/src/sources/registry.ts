import type { SourceSlug } from '@blr/core';
import { housingAdapter } from './housing/adapter';
import { magicbricksAdapter } from './magicbricks/adapter';
import { ninetynineacresAdapter } from './ninetynineacres/adapter';
import { nobrokerAdapter } from './nobroker/adapter';
import type { SourceAdapter } from './types';

const ADAPTERS: Record<SourceSlug, SourceAdapter> = {
  nobroker: nobrokerAdapter,
  magicbricks: magicbricksAdapter,
  housing: housingAdapter,
  ninetynineacres: ninetynineacresAdapter,
};

export function getAdapter(slug: string): SourceAdapter {
  const adapter = (ADAPTERS as Record<string, SourceAdapter | undefined>)[slug];
  if (!adapter) throw new Error(`unknown source "${slug}" (known: ${Object.keys(ADAPTERS).join(', ')})`);
  return adapter;
}

export const listAdapters = (): SourceAdapter[] => Object.values(ADAPTERS);
