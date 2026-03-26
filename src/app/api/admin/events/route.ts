import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { auth } from '@/auth';

// Middleware to check authentication
async function checkAuth() {
  const session = await auth();
  if (!session) {
    return null;
  }
  return session;
}

// GET: List all events
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const events = await prisma.event.findMany({
      orderBy: {
        startDate: 'desc',
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST: Create event
export async function POST(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validatedData = eventSchema.parse(body);

    // Create event
    const event = await prisma.event.create({
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

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
