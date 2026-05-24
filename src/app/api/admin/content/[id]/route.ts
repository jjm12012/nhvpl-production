import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contentBlockUpdateSchema } from '@/lib/validations';
import { ZodError } from 'zod';

async function checkAuth() {
  const session = await auth();
  if (!session) return null;
  return session;
}

// PUT: Update a single content block's value and format. The block must
// already exist (keys are seed-defined and edit-only). Records the editing
// admin's email in `updatedBy` for a lightweight audit trail.
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
    const validated = contentBlockUpdateSchema.parse(body);

    const existing = await prisma.contentBlock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Content block not found' }, { status: 404 });
    }

    const updated = await prisma.contentBlock.update({
      where: { id },
      data: {
        value: validated.value,
        format: validated.format,
        updatedBy: session.user?.email ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
