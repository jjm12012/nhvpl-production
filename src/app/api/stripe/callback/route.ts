import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sendConfirmationEmailForRegistration } from '@/lib/email';
import {
  markRegistrationPaidIfRoom,
  refundOverCapacityStripePayment,
} from '@/lib/registration-capacity';

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

    // Mark paid only if the division still has room (idempotent — safe to run
    // even if the webhook already did it). The form-submission capacity check
    // can be hours stale by the time checkout completes.
    const outcome = await markRegistrationPaidIfRoom({
      registrationId,
      paymentMethod: 'STRIPE_CARD',
      amountPaid: session.amount_total ? session.amount_total / 100 : 30,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    });

    if (outcome === 'division_full') {
      // Division filled while they were on the Stripe checkout page: refund
      // and send them back with an explanation instead of a confirmation.
      await refundOverCapacityStripePayment({
        registrationId,
        paymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripeSessionId: session.id,
      });
      return NextResponse.redirect(
        `${appUrl}/register/${session.metadata?.eventId}/payment?registrationId=${registrationId}&error=division_full`
      );
    }

    // Fire confirmation email exactly once (only when we were the one who
    // flipped the status to PAID — the webhook handler guards against dupes too).
    if (outcome === 'paid') {
      await sendConfirmationEmailForRegistration(registrationId);
    }

    return NextResponse.redirect(`${appUrl}/confirmation/${registrationId}`);
  } catch (error) {
    console.error('Stripe callback error:', error);
    return NextResponse.redirect(`${appUrl}/register`);
  }
}
