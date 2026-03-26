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

// GET: Admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Total paid registrations and revenue
    const paidRegistrations = await prisma.registration.findMany({
      where: {
        paymentStatus: 'PAID',
      },
      include: {
        event: true,
      },
    });

    const totalPaid = paidRegistrations.length;
    const totalRevenue = paidRegistrations.reduce((sum, reg) => {
      return sum + Number(reg.amountPaid || 0);
    }, 0);

    // Registrations today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const registrationsToday = await prisma.registration.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // By Event breakdown
    const byEvent = await prisma.event.findMany({
      include: {
        registrations: {
          where: {
            paymentStatus: 'PAID',
          },
          select: {
            id: true,
            amountPaid: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    const byEventBreakdown = byEvent.map((event) => ({
      eventId: event.id,
      eventName: event.name,
      season: event.season,
      year: event.year,
      paidCount: event.registrations.length,
      revenue: event.registrations.reduce((sum, reg) => {
        return sum + Number(reg.amountPaid || 0);
      }, 0),
    }));

    // By Division breakdown
    const byDivisionStats = await prisma.registration.groupBy({
      by: ['division'],
      where: {
        paymentStatus: 'PAID',
      },
      _count: true,
      _sum: {
        amountPaid: true,
      },
    });

    const byDivisionBreakdown = byDivisionStats.map((stat) => ({
      division: stat.division,
      count: stat._count,
      revenue: Number(stat._sum.amountPaid || 0),
    }));

    return NextResponse.json({
      totalPaid,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      registrationsToday,
      byEvent: byEventBreakdown,
      byDivision: byDivisionBreakdown,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
