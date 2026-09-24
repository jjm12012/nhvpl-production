import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { isOrderWindowOpen, publicProduct } from '@/lib/merch';

// GET: Public details for a merchandise event, consumed by /order/[eventId].
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      include: {
        products: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!event || event.formType !== 'MERCHANDISE') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      description: event.description,
      orderOpenDate: event.orderOpenDate,
      orderCloseDate: event.orderCloseDate,
      isOpen: isOrderWindowOpen(event),
      products: event.products.map(publicProduct),
    });
  } catch (error) {
    console.error('Error fetching merch event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
