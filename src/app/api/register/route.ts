import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registrationSchema } from '@/lib/validations';
import { divisionCapacityKey, divisionLabel } from '@/lib/utils';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = registrationSchema.parse(body);

    // Check for duplicate email+eventId with PAID status
    const existingPaidRegistration = await prisma.registration.findFirst({
      where: {
        email: validatedData.email,
        eventId: validatedData.eventId,
        paymentStatus: 'PAID',
      },
    });

    if (existingPaidRegistration) {
      return NextResponse.json(
        { error: 'An existing PAID registration found for this email and event' },
        { status: 409 }
      );
    }

    // Check event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 400 }
      );
    }

    // Merch events take orders at /order/[eventId], not league registrations.
    if (event.formType !== 'LEAGUE') {
      return NextResponse.json(
        { error: 'This event does not accept league registrations' },
        { status: 400 }
      );
    }

    // Check registration window is open
    const now = new Date();
    if (now < event.registrationOpen) {
      return NextResponse.json(
        { error: 'Registration has not opened yet' },
        { status: 400 }
      );
    }

    if (now > event.registrationClose) {
      return NextResponse.json(
        { error: 'Registration window has closed' },
        { status: 400 }
      );
    }

    // Check capacity for the selected division if a cap is set.
    // Only PAID registrations count toward the cap; PENDING signups do not hold a spot.
    const capKey = divisionCapacityKey(validatedData.division);
    const divisionCap = event[capKey];

    if (typeof divisionCap === 'number') {
      const paidCount = await prisma.registration.count({
        where: {
          eventId: validatedData.eventId,
          division: validatedData.division,
          paymentStatus: 'PAID',
        },
      });

      if (paidCount >= divisionCap) {
        return NextResponse.json(
          {
            error: `The ${divisionLabel(validatedData.division)} division is full`,
            division: validatedData.division,
          },
          { status: 409 }
        );
      }
    }

    // Get client IP
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      undefined;

    // Create registration with PENDING status
    const registration = await prisma.registration.create({
      data: {
        eventId: validatedData.eventId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        division: validatedData.division,
        canCommit: validatedData.canCommit,
        interestedInCaptain: validatedData.interestedInCaptain === 'yes',
        willingToMonitor: validatedData.willingToMonitor === 'yes',
        teamPreference: validatedData.teamPreference,
        liabilityAck: validatedData.liabilityAck,
        funAck: validatedData.funAck,
        paymentStatus: 'PENDING',
        ipAddress,
      },
    });

    return NextResponse.json(
      {
        registrationId: registration.id,
        eventId: registration.eventId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
