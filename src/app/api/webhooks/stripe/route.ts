import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendConfirmationEmailForRegistration } from '@/lib/email';
import { isMerchCheckoutSession, recordPaidMerchOrder } from '@/lib/merch-orders';
import {
  markRegistrationPaidIfRoom,
  refundOverCapacityStripePayment,
} from '@/lib/registration-capacity';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Merchandise orders: insert the order row + fire emails (idempotent —
      // the success-page confirm endpoint may have already recorded it).
      if (isMerchCheckoutSession(session)) {
        if (session.payment_status === 'paid') {
          await recordPaidMerchOrder(session);
        }
        return NextResponse.json({ received: true });
      }

      const registrationId = session.metadata?.registrationId;

      if (!registrationId) {
        console.warn('checkout.session.completed without registrationId in metadata');
        return NextResponse.json({ received: true });
      }

      if (session.payment_status === 'paid') {
        // Re-check capacity at payment time: the form-submission check can be
        // hours stale by the time checkout completes. Marks PAID atomically
        // only if the division still has room.
        const outcome = await markRegistrationPaidIfRoom({
          registrationId,
          paymentMethod: 'STRIPE_CARD',
          amountPaid: session.amount_total ? session.amount_total / 100 : 30,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
        });

        if (outcome === 'paid') {
          console.log(`Registration ${registrationId} marked as PAID via webhook`);
          // Only send the confirmation email when we actually transition into
          // PAID (if the stripe callback beat the webhook, it already sent it).
          await sendConfirmationEmailForRegistration(registrationId);
        } else if (outcome === 'division_full') {
          await refundOverCapacityStripePayment({
            registrationId,
            paymentIntentId: session.payment_intent as string,
            stripeSessionId: session.id,
          });
        } else if (outcome === 'not_found') {
          console.warn(`checkout.session.completed for unknown registration ${registrationId}`);
        }
      }
    }

    // Handle failed payment
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const registrationId = paymentIntent.metadata?.registrationId;

      if (registrationId) {
        await prisma.registration.update({
          where: { id: registrationId },
          data: { paymentStatus: 'FAILED' },
        });
        console.log(`Registration ${registrationId} marked as FAILED via webhook`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
