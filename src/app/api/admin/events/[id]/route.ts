import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventSchema, merchandiseEventSchema } from '@/lib/validations';
import { merchEventData, merchProductData } from '@/lib/merch';
import { ZodError } from 'zod';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// PUT: Full event update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Merchandise events: update the event, upsert its products by id, and
    // delete products that were removed from the form — but only if they
    // have no orders (a product with orders must be deactivated instead).
    if (body.formType === 'MERCHANDISE') {
      const validated = merchandiseEventSchema.parse(body);

      const existing = await prisma.merchProduct.findMany({
        where: { eventId: id },
        include: { _count: { select: { orders: true } } },
      });
      const keepIds = new Set(
        validated.products.map((p) => p.id).filter((v): v is string => Boolean(v))
      );
      const removed = existing.filter((p) => !keepIds.has(p.id));
      const blocked = removed.filter((p) => p._count.orders > 0);
      if (blocked.length > 0) {
        return NextResponse.json(
          {
            error: `"${blocked[0].name}" has ${blocked[0]._count.orders} order(s) and can't be removed. Uncheck Active to hide it instead.`,
            productIds: blocked.map((p) => p.id),
          },
          { status: 409 }
        );
      }

      // Guard against ids that belong to another event.
      const existingIds = new Set(existing.map((p) => p.id));
      for (const p of validated.products) {
        if (p.id && !existingIds.has(p.id)) {
          return NextResponse.json({ error: 'Unknown product id' }, { status: 400 });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.event.update({ where: { id }, data: merchEventData(validated) });
        if (removed.length > 0) {
          await tx.merchProduct.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
        }
        for (const [i, p] of validated.products.entries()) {
          const data = merchProductData(p, i);
          if (p.id) {
            await tx.merchProduct.update({ where: { id: p.id }, data });
          } else {
            await tx.merchProduct.create({ data: { ...data, eventId: id } });
          }
        }
        return tx.event.findUniqueOrThrow({
          where: { id },
          include: { products: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      return NextResponse.json(updated);
    }

    const validatedData = eventSchema.parse(body);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        season: validatedData.season,
        year: validatedData.year,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        registrationOpen: validatedData.registrationOpen,
        registrationClose: validatedData.registrationClose,
        price: validatedData.price,
        currency: validatedData.currency,
        maxBeginner: validatedData.maxBeginner,
        maxIntermediateA: validatedData.maxIntermediateA,
        maxIntermediateB: validatedData.maxIntermediateB,
        maxAdvancedA: validatedData.maxAdvancedA,
        maxAdvancedB: validatedData.maxAdvancedB,
        location: validatedData.location,
        dayOfWeek: validatedData.dayOfWeek,
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE: Hard-delete the event. Associated registrations are removed via
// the onDelete: Cascade relation defined in prisma/schema.prisma.
// Deactivation (soft-delete) is handled separately via PATCH /toggle.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
