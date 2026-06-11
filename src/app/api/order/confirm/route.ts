import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { isMerchCheckoutSession, recordPaidMerchOrder } from '@/lib/merch-orders';

// GET: Called by the order success page. Verifies the Stripe session, records
// the order idempotently (the webhook may have done so already), and returns
// order details for display.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!isMerchCheckoutSession(session)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    const order = await recordPaidMerchOrder(session);
    if (!order) {
      return NextResponse.json({ error: 'Order could not be recorded' }, { status: 500 });
    }

    const { prisma } = await import('@/lib/prisma');
    const event = await prisma.event.findUnique({
      where: { id: order.eventId },
      select: { name: true },
    });

    return NextResponse.json({
      id: order.id,
      eventName: event?.name ?? '',
      name: order.name,
      email: order.email,
      size: order.size,
      color: order.color,
      quantity: order.quantity,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Order confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 });
  }
}
