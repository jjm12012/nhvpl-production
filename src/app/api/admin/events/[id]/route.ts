import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// Middleware to check authentication
async function checkAuth() {
  const session = await auth();
  if (!session) {
    return null;
  }
  return session;
}

// PUT: Update event
export async function PUT(
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
    const body = await request.json();

    // Validate request body
    const validatedData = eventSchema.parse(body);

    // Check event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Update event
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
        price: new (require('@prisma/client/runtime/library').Decimal)(
          validatedData.price.toString()
        ),
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
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Event update error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete event
export async function DELETE(
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

    // Check event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedEvent = await prisma.event.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json(deletedEvent);
  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
