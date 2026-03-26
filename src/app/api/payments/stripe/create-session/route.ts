import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: 'registrationId is required' },
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: registration.event.currency.toLowerCase(),
            product_data: {
              name: `${registration.event.name} Registration`,
              description: `${registration.event.season} ${registration.event.year}`,
            },
            unit_amount: Math.round(Number(registration.event.price) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/confirmation/${registrationId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events`,
      metadata: {
        registrationId,
        eventId: registration.eventId,
      },
      customer_email: registration.email,
    });

    // Update registration with stripeSessionId
    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        stripeSessionId: session.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
