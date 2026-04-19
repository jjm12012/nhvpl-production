import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendConfirmationEmailForRegistration } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { registrationId, paymentMethod, amount } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Registration already paid' }, { status: 409 });
    }

    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod === 'SIMULATED' ? 'STRIPE_CARD' : paymentMethod,
        amountPaid: amount ?? 30,
        paidAt: new Date(),
      },
    });

    await sendConfirmationEmailForRegistration(updated.id);

    return NextResponse.json({ success: true, registrationId: updated.id }, { status: 200 });
  } catch (error) {
    console.error('Mark-paid error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
