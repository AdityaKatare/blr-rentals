import { NextResponse } from 'next/server';
import { SearchQuerySchema } from '@blr/core';
import { searchListings } from '@blr/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = SearchQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    return NextResponse.json(await searchListings(getDb().sql, parsed.data));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('unknown locality')) return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: 'search failed', message }, { status: 500 });
  }
}
