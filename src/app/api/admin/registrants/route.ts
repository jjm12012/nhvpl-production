import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Middleware to check authentication
async function checkAuth() {
  const session = await auth();
  if (!session) {
    return null;
  }
  return session;
}

// GET with filtering, pagination, and sorting
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

    // Query parameters
    const eventId = searchParams.get('eventId');
    const skillLevel = searchParams.get('skillLevel');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    // Build where clause
    const where: any = {};

    if (eventId) {
      where.eventId = eventId;
    }

    if (skillLevel) {
      where.division = skillLevel;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortDir.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch registrations
    const registrations = await prisma.registration.findMany({
      where,
      include: {
        event: true,
      },
      orderBy,
      skip,
      take: limit,
    });

    // Get total count
    const total = await prisma.registration.count({ where });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching registrants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrants' },
      { status: 500 }
    );
  }
}
