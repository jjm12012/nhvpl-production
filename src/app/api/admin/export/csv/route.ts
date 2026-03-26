import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Middleware to check authentication
async function checkAuth() {
  const session = await auth();
  if (!session) {
    return null;
  }
  return session;
}

// Helper to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

// GET: Export registrations as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    // Fetch PAID registrations with event
    const where: any = {
      paymentStatus: 'PAID',
    };

    if (eventId) {
      where.eventId = eventId;
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // CSV Headers
    const headers = [
      'Registration ID',
      'Event Name',
      'Season',
      'Year',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Division',
      'Captain Interest',
      'Payment Status',
      'Payment Method',
      'Amount Paid',
      'Paid At',
      'Registered At',
    ];

    // CSV Rows
    const rows = registrations.map((reg) => [
      escapeCSV(reg.id),
      escapeCSV(reg.event.name),
      escapeCSV(reg.event.season),
      escapeCSV(reg.event.year),
      escapeCSV(reg.firstName),
      escapeCSV(reg.lastName),
      escapeCSV(reg.email),
      escapeCSV(reg.phone),
      escapeCSV(reg.division),
      escapeCSV(reg.interestedInCaptain ? 'Yes' : 'No'),
      escapeCSV(reg.paymentStatus),
      escapeCSV(reg.paymentMethod || ''),
      escapeCSV(reg.amountPaid ? String(reg.amountPaid) : ''),
      escapeCSV(reg.paidAt ? reg.paidAt.toISOString() : ''),
      escapeCSV(reg.createdAt.toISOString()),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Generate filename
    const filename = `nhvpl-registrations-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
