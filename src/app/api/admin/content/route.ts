import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// GET: List all editable content blocks (admin only), ordered by page then key
// so the admin UI can group them predictably.
export async function GET() {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocks = await prisma.contentBlock.findMany({
      orderBy: [{ page: 'asc' }, { key: 'asc' }],
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Error fetching content blocks:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
