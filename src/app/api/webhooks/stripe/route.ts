import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendConfirmationEmailForRegistration } from '@/lib/email';
import { isMerchCheckoutSession, recordPaidMerchOrder } from '@/lib/merch-orders';

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
        // Only send the confirmation email when we actually transition into PAID.
        // If the record was already PAID (e.g. stripe callback beat the webhook),
        // we avoid double-emailing the user.
        const existing = await prisma.registration.findUnique({
          where: { id: registrationId },
          select: { paymentStatus: true },
        });

        await prisma.registration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'STRIPE_CARD',
            amountPaid: session.amount_total ? session.amount_total / 100 : 30,
            paidAt: new Date(),
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
          },
        });
        console.log(`Registration ${registrationId} marked as PAID via webhook`);

        if (existing && existing.paymentStatus !== 'PAID') {
          await sendConfirmationEmailForRegistration(registrationId);
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
