import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isOrderWindowOpen } from '@/lib/merch';

// GET: Public details for a merchandise event, consumed by /order/[eventId].
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
    });

    if (!event || event.formType !== 'MERCHANDISE') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      description: event.description,
      unitPrice: event.unitPrice ? Number(event.unitPrice) : null,
      availableColors: event.availableColors,
      orderOpenDate: event.orderOpenDate,
      orderCloseDate: event.orderCloseDate,
      isOpen: isOrderWindowOpen(event),
    });
  } catch (error) {
    console.error('Error fetching merch event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
