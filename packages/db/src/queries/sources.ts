import type { SourceSlug } from '@blr/core';
import type { Sql } from '../client';

export async function resolveSourceId(sql: Sql, slug: SourceSlug): Promise<number> {
  const rows = await sql<{ id: number }[]>`SELECT id FROM sources WHERE slug = ${slug}`;
  const row = rows[0];
  if (!row) throw new Error(`source "${slug}" is not seeded; run pnpm db:seed`);
  return row.id;
}
