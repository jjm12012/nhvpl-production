import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Called by Stripe after successful payment — verifies session, marks paid, redirects to confirmation
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('session_id');
  const registrationId = searchParams.get('registrationId');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!sessionId || !registrationId) {
    return NextResponse.redirect(`${appUrl}/register`);
  }

  try {
    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      // Payment not completed — send back to payment page
      return NextResponse.redirect(
        `${appUrl}/register/${session.metadata?.eventId}/payment?registrationId=${registrationId}&error=payment_incomplete`
      );
    }

    // Mark registration as paid (idempotent — safe to run even if webhook already did it)
    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'STRIPE_CARD',
        amountPaid: session.amount_total ? session.amount_total / 100 : 30,
        paidAt: new Date(),
        stripeSessionId: session.id,
      },
    });

    return NextResponse.redirect(`${appUrl}/confirmation/${registrationId}`);
  } catch (error) {
    console.error('Stripe callback error:', error);
    return NextResponse.redirect(`${appUrl}/register`);
  }
}
