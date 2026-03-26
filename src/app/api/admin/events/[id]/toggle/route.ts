import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await checkAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { isActive: !event.isActive },
    });
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Event toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle event' }, { status: 500 });
  }
}
