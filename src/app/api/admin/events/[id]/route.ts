import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema } from '@/lib/validations';
import { ZodError } from 'zod';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await checkAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const body = await request.json();
    const validatedData = eventSchema.parse(body);
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        season: validatedData.season,
        year: validatedData.year,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        registrationOpen: validatedData.registrationOpen,
        registrationClose: validatedData.registrationClose,
        price: validatedData.price,
        currency: validatedData.currency,
        maxCapacity: validatedData.maxCapacity,
        location: validatedData.location,
        dayOfWeek: validatedData.dayOfWeek,
        isActive: validatedData.isActive,
      },
    });
    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await checkAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const deletedEvent = await prisma.event.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json(deletedEvent);
  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
