import { NextResponse } from 'next/server';
import { SearchQuerySchema } from '@blr/core';

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

  return NextResponse.json({ query: parsed.data, message: 'search not implemented yet (M4)' }, { status: 501 });
}
