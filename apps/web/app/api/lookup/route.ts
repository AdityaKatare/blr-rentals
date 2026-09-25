import { SOURCE_SLUGS, type SourceSlug } from '@blr/core';
import { listingBySourceId } from '@blr/db';
import { NextResponse, type NextRequest } from 'next/server';
import { getDb, reportDbError } from '@/server/db';

export const dynamic = 'force-dynamic';

const CACHE = 'public, s-maxage=300, stale-while-revalidate=600';
const SOURCE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const isSource = (v: string | null): v is SourceSlug => v !== null && (SOURCE_SLUGS as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const source = params.get('source');
  const id = params.get('id');
  if (!isSource(source) || id === null || !SOURCE_ID.test(id)) {
    return NextResponse.json(
      { error: 'invalid_query', expected: { source: [...SOURCE_SLUGS], id: 'the listing id from the portal URL' } },
      { status: 400 },
    );
  }
  try {
    const found = await listingBySourceId(getDb().sql, source, id);
    if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': CACHE } });
    return NextResponse.json({ listing: found.hit, lastSeenAt: found.lastSeenAt }, { headers: { 'Cache-Control': CACHE } });
  } catch (err) {
    return NextResponse.json({ error: 'unavailable', message: reportDbError(err) }, { status: 503 });
  }
}
