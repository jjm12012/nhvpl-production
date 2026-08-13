import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SkillLevel } from '@prisma/client';

// Division paid-counts must always be live. Without this, Next 14 statically
// caches this GET handler at build time (it reads nothing from the request),
// so "Full" badges freeze at whatever the counts were at the last deploy.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    // Fetch all active events where registration window is open
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        // Merch events have their own public form at /order/[eventId] and
        // must not appear in the league registration listing.
        formType: 'LEAGUE',
        registrationOpen: {
          lte: now,
        },
        registrationClose: {
          gte: now,
        },
      },
      include: {
        registrations: {
          // Only count completed (PAID) registrations toward the division cap.
          // PENDING signups (step 1 completed, payment not yet made) do not hold a spot.
          where: {
            paymentStatus: 'PAID',
          },
          select: {
            id: true,
            division: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Transform response to include paidCount (total) and per-division counts
    const formattedEvents = events.map((event) => {
      const countsByDivision: Record<SkillLevel, number> = {
        BEGINNER: 0,
        INTERMEDIATE_A: 0,
        INTERMEDIATE_B: 0,
        ADVANCED_A: 0,
        ADVANCED_B: 0,
      };
      for (const r of event.registrations) {
        countsByDivision[r.division] = (countsByDivision[r.division] || 0) + 1;
      }

      return {
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
        maxBeginner: event.maxBeginner,
        maxIntermediateA: event.maxIntermediateA,
        maxIntermediateB: event.maxIntermediateB,
        maxAdvancedA: event.maxAdvancedA,
        maxAdvancedB: event.maxAdvancedB,
        location: event.location,
        dayOfWeek: event.dayOfWeek,
        isActive: event.isActive,
        paidCount: event.registrations.length,
        paidCountsByDivision: countsByDivision,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching active events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
