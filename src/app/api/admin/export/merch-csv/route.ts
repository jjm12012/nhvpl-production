import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// Helper to escape CSV values (matches the league signup export).
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

// GET: Export merchandise orders for one event as CSV.
// Usage: /api/admin/export/merch-csv?eventId=...
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.formType !== 'MERCHANDISE') {
      return NextResponse.json({ error: 'Merchandise event not found' }, { status: 404 });
    }

    const orders = await prisma.merchandiseOrder.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'Order ID',
      'Name',
      'Email',
      'Fit',
      'Size',
      'Color',
      'Quantity',
      'Unit Price',
      'Total',
      'Payment Status',
      'Order Date',
    ];

    const rows = orders.map((order) => [
      escapeCSV(order.id),
      escapeCSV(order.name),
      escapeCSV(order.email),
      escapeCSV(order.fit),
      escapeCSV(order.size),
      escapeCSV(order.color),
      escapeCSV(order.quantity),
      escapeCSV(String(order.unitPrice)),
      escapeCSV(String(order.totalAmount)),
      escapeCSV(order.stripePaymentStatus),
      escapeCSV(order.createdAt.toISOString()),
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // [event-name]-orders.csv (slugified)
    const slug = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = `${slug || 'merch'}-orders.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Merch CSV export error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
