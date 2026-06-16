import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { merchandiseOrderSchema } from '@/lib/validations';
import { isOrderWindowOpen } from '@/lib/merch';

// POST: Create a Stripe Checkout session for a shirt order.
// No DB row is written here — the order is recorded only after payment
// succeeds (webhook / success-page confirm), keyed on the session id.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = merchandiseOrderSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event || event.formType !== 'MERCHANDISE') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!isOrderWindowOpen(event)) {
      return NextResponse.json({ error: 'Orders are closed for this event' }, { status: 400 });
    }

    if (!event.unitPrice) {
      return NextResponse.json({ error: 'This event has no price configured' }, { status: 400 });
    }

    if (!event.availableColors.includes(data.color)) {
      return NextResponse.json({ error: 'Selected color is not available' }, { status: 400 });
    }

    const unitPrice = Number(event.unitPrice);
    const unitPriceInCents = Math.round(unitPrice * 100);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.name} - ${data.fit} / ${data.color} / ${data.size}`,
            },
            unit_amount: unitPriceInCents,
          },
          quantity: data.quantity,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/order/${event.id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order/${event.id}`,
      customer_email: data.email,
      metadata: {
        merch: 'true',
        event_id: event.id,
        name: data.name,
        email: data.email,
        fit: data.fit,
        size: data.size,
        color: data.color,
        quantity: String(data.quantity),
        unit_price: String(unitPrice),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Merch checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
