import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();

    // Fetch all active events where registration window is open
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        registrationOpen: {
          lte: now,
        },
        registrationClose: {
          gte: now,
        },
      },
      include: {
        registrations: {
          where: {
            paymentStatus: 'PAID',
          },
          select: {
            id: true, // just need count, but include id for counting
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Transform response to include paidCount
    const formattedEvents = events.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      season: event.season,
      year: event.year,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationOpen: event.registrationOpen,
      registrationClose: event.registrationClose,
      price: event.price,
      currency: event.currency,
      maxCapacity: event.maxCapacity,
      location: event.location,
      dayOfWeek: event.dayOfWeek,
      isActive: event.isActive,
      paidCount: event.registrations.length,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching active events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
