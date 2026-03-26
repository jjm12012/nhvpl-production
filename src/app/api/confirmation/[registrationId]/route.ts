import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const { registrationId } = params;

    // Fetch registration with event
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Only return if payment status is PAID
    if (registration.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'Registration payment not completed' },
        { status: 403 }
      );
    }

    // Return sanitized data (no payment tokens)
    return NextResponse.json({
      id: registration.id,
      eventId: registration.eventId,
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      phone: registration.phone,
      division: registration.division,
      canCommit: registration.canCommit,
      interestedInCaptain: registration.interestedInCaptain,
      willingToMonitor: registration.willingToMonitor,
      teamPreference: registration.teamPreference,
      liabilityAck: registration.liabilityAck,
      funAck: registration.funAck,
      paymentStatus: registration.paymentStatus,
      paymentMethod: registration.paymentMethod,
      amountPaid: registration.amountPaid,
      paidAt: registration.paidAt,
      createdAt: registration.createdAt,
      event: {
        id: registration.event.id,
        name: registration.event.name,
        season: registration.event.season,
        year: registration.event.year,
        startDate: registration.event.startDate,
        endDate: registration.event.endDate,
        location: registration.event.location,
        dayOfWeek: registration.event.dayOfWeek,
      },
    });
  } catch (error) {
    console.error('Error fetching confirmation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch confirmation' },
      { status: 500 }
    );
  }
}
