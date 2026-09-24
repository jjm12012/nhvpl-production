import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema, merchandiseEventSchema } from '@/lib/validations';
import { merchEventData, merchProductData } from '@/lib/merch';
import { ZodError } from 'zod';
import { auth } from '@/auth';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// GET: List all events
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { registrations: true, merchandiseOrders: true } },
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST: Create event
export async function POST(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Merchandise events use a reduced field set. League-specific NOT NULL
    // columns (season, year, dates, price) are filled from the order window
    // and unit price so the rest of the app keeps working unchanged.
    if (body.formType === 'MERCHANDISE') {
      const validated = merchandiseEventSchema.parse(body);
      const event = await prisma.event.create({
        data: {
          ...merchEventData(validated),
          products: {
            create: validated.products.map((p, i) => merchProductData(p, i)),
          },
        },
        include: { products: { orderBy: { sortOrder: 'asc' } } },
      });
      return NextResponse.json(event, { status: 201 });
    }

    const validatedData = eventSchema.parse(body);

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
        price: validatedData.price,
        currency: validatedData.currency,
        maxBeginner: validatedData.maxBeginner,
        maxIntermediateA: validatedData.maxIntermediateA,
        maxIntermediateB: validatedData.maxIntermediateB,
        maxAdvancedA: validatedData.maxAdvancedA,
        maxAdvancedB: validatedData.maxAdvancedB,
        location: validatedData.location,
        dayOfWeek: validatedData.dayOfWeek,
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Event creation error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
