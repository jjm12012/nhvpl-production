import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    // Fetch registration + event details
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const amount = Number(registration.event.price) * 100; // Stripe uses cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: registration.event.name,
              description: `${registration.event.name} — ${registration.firstName} ${registration.lastName}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: registration.email,
      metadata: {
        registrationId: registration.id,
        eventId: registration.eventId,
      },
      success_url: `${appUrl}/api/stripe/callback?session_id={CHECKOUT_SESSION_ID}&registrationId=${registration.id}`,
      cancel_url: `${appUrl}/register/${registration.eventId}/payment?registrationId=${registration.id}&cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
