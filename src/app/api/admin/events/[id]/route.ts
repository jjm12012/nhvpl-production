import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema, merchandiseEventSchema } from '@/lib/validations';
import { merchEventData } from '@/lib/merch';
import { ZodError } from 'zod';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// PUT: Full event update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Merchandise events update via the reduced merch field set.
    if (body.formType === 'MERCHANDISE') {
      const validated = merchandiseEventSchema.parse(body);
      const updated = await prisma.event.update({
        where: { id },
        data: merchEventData(validated),
      });
      return NextResponse.json(updated);
    }

    const validatedData = eventSchema.parse(body);

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
        maxBeginner: validatedData.maxBeginner,
        maxIntermediateA: validatedData.maxIntermediateA,
        maxIntermediateB: validatedData.maxIntermediateB,
        maxAdvanced: validatedData.maxAdvanced,
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

// DELETE: Hard-delete the event. Associated registrations are removed via
// the onDelete: Cascade relation defined in prisma/schema.prisma.
// Deactivation (soft-delete) is handled separately via PATCH /toggle.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
