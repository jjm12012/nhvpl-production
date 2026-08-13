import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmailForRegistration } from '@/lib/email';
import { markRegistrationPaidIfRoom } from '@/lib/registration-capacity';

// SECURITY NOTE: this endpoint marks a registration PAID without verifying
// any payment. Its only caller is the dev-only "simulated payment" button on
// the payment page, but the route itself is reachable in production. It
// should be removed or gated behind auth / NODE_ENV before the next season.
export async function POST(request: NextRequest) {
  try {
    const { registrationId, paymentMethod, amount } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    const outcome = await markRegistrationPaidIfRoom({
      registrationId,
      paymentMethod: paymentMethod === 'SIMULATED' ? 'STRIPE_CARD' : paymentMethod,
      amountPaid: amount ?? 30,
    });

    if (outcome === 'not_found') {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (outcome === 'already_paid') {
      return NextResponse.json({ error: 'Registration already paid' }, { status: 409 });
    }

    if (outcome === 'division_full') {
      return NextResponse.json(
        { error: 'This division is at capacity. Please email nhvpickleball@gmail.com to be added to the waitlist.' },
        { status: 409 }
      );
    }

    await sendConfirmationEmailForRegistration(registrationId);

    return NextResponse.json({ success: true, registrationId }, { status: 200 });
  } catch (error) {
    console.error('Mark-paid error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
