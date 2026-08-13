import { Prisma, PaymentMethod } from '@prisma/client';
import { prisma } from './prisma';
import { stripe } from './stripe';
import { divisionCapacityKey } from './utils';

export type MarkPaidOutcome = 'paid' | 'already_paid' | 'division_full' | 'not_found';

/**
 * Atomically re-checks division capacity and marks a registration PAID.
 *
 * The public form's capacity check runs at form submission, but payment can
 * complete much later (Stripe Checkout sessions live up to 24h). Without a
 * re-check at payment time, a slow payer can land after the division fills —
 * which is exactly how Advanced B ended up 73/72 on 2026-08-11.
 *
 * Runs in a Serializable transaction so two payments completing at the same
 * moment cannot both pass the count. If the transaction fails due to a
 * serialization conflict, the caller's retry (e.g. Stripe webhook redelivery)
 * will settle it.
 */
export async function markRegistrationPaidIfRoom(args: {
  registrationId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<MarkPaidOutcome> {
  return prisma.$transaction(
    async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id: args.registrationId },
        include: { event: true },
      });

      if (!registration || !registration.event) return 'not_found';
      if (registration.paymentStatus === 'PAID') return 'already_paid';

      const cap = registration.event[divisionCapacityKey(registration.division)];
      if (typeof cap === 'number') {
        const paidCount = await tx.registration.count({
          where: {
            eventId: registration.eventId,
            division: registration.division,
            paymentStatus: 'PAID',
          },
        });
        if (paidCount >= cap) return 'division_full';
      }

      await tx.registration.update({
        where: { id: args.registrationId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: args.paymentMethod,
          amountPaid: args.amountPaid,
          paidAt: new Date(),
          ...(args.stripeSessionId ? { stripeSessionId: args.stripeSessionId } : {}),
          ...(args.stripePaymentIntentId
            ? { stripePaymentIntentId: args.stripePaymentIntentId }
            : {}),
        },
      });

      return 'paid';
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * A payment completed but the division filled while checkout was open:
 * refund the charge and record the registration as REFUNDED so the player
 * never appears on the roster. Stripe emails the payer a refund receipt
 * automatically (if enabled in Stripe settings); the admin should follow up
 * with a waitlist offer.
 */
export async function refundOverCapacityStripePayment(args: {
  registrationId: string;
  paymentIntentId?: string | null;
  stripeSessionId?: string | null;
}): Promise<void> {
  if (args.paymentIntentId) {
    await stripe.refunds.create({ payment_intent: args.paymentIntentId });
  }

  await prisma.registration.update({
    where: { id: args.registrationId },
    data: {
      paymentStatus: 'REFUNDED',
      ...(args.stripeSessionId ? { stripeSessionId: args.stripeSessionId } : {}),
      ...(args.paymentIntentId ? { stripePaymentIntentId: args.paymentIntentId } : {}),
    },
  });

  console.warn(
    `Registration ${args.registrationId}: payment completed after division filled — refunded and marked REFUNDED. Admin follow-up recommended.`
  );
}
