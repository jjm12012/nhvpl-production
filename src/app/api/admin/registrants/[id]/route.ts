import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Middleware to check authentication
async function checkAuth() {
  const session = await auth();
  if (!session) {
    return null;
  }
  return session;
}

// GET: Single registrant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Fetch single registrant with event
    const registrant = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!registrant) {
      return NextResponse.json(
        { error: 'Registrant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(registrant);
  } catch (error) {
    console.error('Error fetching registrant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrant' },
      { status: 500 }
    );
  }
}
