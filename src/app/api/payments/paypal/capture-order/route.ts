import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendConfirmationEmailForRegistration } from '@/lib/email';
import { markRegistrationPaidIfRoom } from '@/lib/registration-capacity';

/**
 * PayPal Capture Order API
 * This is a placeholder implementation. In production, this would integrate
 * with the PayPal API to capture (finalize) orders.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, registrationId } = body;

    if (!orderId || !registrationId) {
      return NextResponse.json(
        { error: 'orderId and registrationId are required' },
        { status: 400 }
      );
    }

    // Fetch registration and event from DB
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

    if (!registration.event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // TODO: Implement actual PayPal API integration
    // Example implementation structure:
    // 1. Call PayPal API to capture the order
    // 2. Verify the capture was successful
    // 3. Extract amount and update registration
    //
    // NOTE: capture the PayPal order only AFTER markRegistrationPaidIfRoom
    // returns 'paid' — that way a division-full result means nothing was
    // charged and no refund is needed.

    // Mark registration as PAID only if the division still has room. The
    // capacity check at form submission can be stale by the time payment
    // completes.
    const outcome = await markRegistrationPaidIfRoom({
      registrationId,
      paymentMethod: 'PAYPAL',
      amountPaid: Number(registration.event.price),
    });

    if (outcome === 'division_full') {
      return NextResponse.json(
        {
          error:
            'This division filled up while you were completing payment. You have not been charged. Please email nhvpickleball@gmail.com to be added to the waitlist.',
        },
        { status: 409 }
      );
    }

    if (outcome === 'paid') {
      await sendConfirmationEmailForRegistration(registrationId);
    }

    return NextResponse.json({
      status: 'COMPLETED',
    });
  } catch (error) {
    console.error('PayPal order capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture PayPal order' },
      { status: 500 }
    );
  }
}
