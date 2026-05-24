import { NextRequest, NextResponse } from 'next/server';
import { getContentMap } from '@/lib/content';

// Public, read-only endpoint used by client components (registration form,
// payment page) to fetch admin-editable copy. Returns a key -> {value, format}
// map for the requested page, with database edits merged over the defaults.
//
// Always render live so admin edits appear immediately.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page');

  if (!page) {
    return NextResponse.json({ error: 'Missing "page" query parameter' }, { status: 400 });
  }

  const map = await getContentMap(page);
  return NextResponse.json(map);
}
