import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendConfirmationEmailForRegistration } from '@/lib/email';

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

    // Mark registration as PAID
    const now = new Date();
    const wasAlreadyPaid = registration.paymentStatus === 'PAID';

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'PAYPAL',
        amountPaid: registration.event.price,
        paidAt: now,
      },
    });

    if (!wasAlreadyPaid) {
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
