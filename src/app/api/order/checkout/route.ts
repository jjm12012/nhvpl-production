import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { merchandiseOrderSchema } from '@/lib/validations';
import { isOrderWindowOpen } from '@/lib/merch';

// POST: Create a Stripe Checkout session for one merch order line
// (one product, one size/color/fit, quantity N).
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

    // The product must belong to this event and be active; every option the
    // buyer chose must be one the product actually offers.
    const product = await prisma.merchProduct.findFirst({
      where: { id: data.productId, eventId: event.id, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Selected item is not available' }, { status: 400 });
    }

    if (!product.availableColors.includes(data.color)) {
      return NextResponse.json({ error: 'Selected color is not available' }, { status: 400 });
    }
    if (!product.sizes.includes(data.size)) {
      return NextResponse.json({ error: 'Selected size is not available' }, { status: 400 });
    }

    let fit: string | null = null;
    if (product.fits.length > 0) {
      if (!data.fit || !product.fits.includes(data.fit)) {
        return NextResponse.json({ error: 'Please select a fit' }, { status: 400 });
      }
      fit = data.fit;
    }

    const unitPrice = Number(product.unitPrice);
    const unitPriceInCents = Math.round(unitPrice * 100);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${product.name} — ${[fit, data.color, data.size].filter(Boolean).join(' / ')}`,
              description: event.name,
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
        product_id: product.id,
        product_name: product.name,
        name: data.name,
        email: data.email,
        // Omitted (not empty) when the product has no fit options.
        ...(fit ? { fit } : {}),
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
