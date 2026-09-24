import type Stripe from 'stripe';
import type { MerchandiseOrder } from '@prisma/client';

// Server-only helpers for recording paid merchandise orders.
//
// Both the Stripe webhook (checkout.session.completed) and the success-page
// confirm endpoint call recordPaidMerchOrder. Whichever runs first inserts the
// row and sends the emails; the other sees the existing row (unique
// stripeSessionId) and does nothing. This mirrors the league registration
// callback/webhook double-write guard.

export function isMerchCheckoutSession(
  session: Stripe.Checkout.Session
): boolean {
  return session.metadata?.merch === 'true';
}

export async function recordPaidMerchOrder(
  session: Stripe.Checkout.Session
): Promise<MerchandiseOrder | null> {
  const { prisma } = await import('./prisma');

  const metadata = session.metadata || {};
  const eventId = metadata.event_id;
  const productId = metadata.product_id;
  const productName = metadata.product_name;
  const name = metadata.name;
  const email = metadata.email;
  const fit = metadata.fit || null; // absent for products without fit options
  const size = metadata.size;
  const color = metadata.color;
  const quantity = parseInt(metadata.quantity || '1', 10);
  const unitPrice = parseFloat(metadata.unit_price || '0');

  if (!eventId || !productId || !productName || !name || !email || !size || !color) {
    console.warn('[merch] checkout session missing order metadata, skipping', session.id);
    return null;
  }

  // Idempotency: bail if this session was already recorded.
  const existing = await prisma.merchandiseOrder.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) {
    return existing;
  }

  const totalAmount = session.amount_total
    ? session.amount_total / 100
    : quantity * unitPrice;

  let order: MerchandiseOrder;
  try {
    order = await prisma.merchandiseOrder.create({
      data: {
        eventId,
        productId,
        productName,
        name,
        email,
        fit,
        size,
        color,
        quantity,
        unitPrice,
        totalAmount,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        stripePaymentStatus: 'paid',
      },
    });
  } catch (error: any) {
    // Unique violation on stripeSessionId: the other writer won the race.
    if (error?.code === 'P2002') {
      return prisma.merchandiseOrder.findUnique({
        where: { stripeSessionId: session.id },
      });
    }
    throw error;
  }

  console.log(`[merch] order ${order.id} recorded as paid (session ${session.id})`);

  // Emails fire only from the writer that created the row — exactly once.
  const { sendMerchOrderEmails } = await import('./email');
  await sendMerchOrderEmails(order.id);

  return order;
}
