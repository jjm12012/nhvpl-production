// One-time admin seed endpoint — NOT behind /api/admin so middleware won't block it
// Call: https://nhvpl-production.vercel.app/api/setup  (GET or POST)
// Creates the admin user from ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD env vars
// Safe to call multiple times — skips if admin already exists

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const email = process.env.ADMIN_SEED_EMAIL;
    const password = process.env.ADMIN_SEED_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in env vars' },
        { status: 500 }
      );
    }

    // Check if admin already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({
        message: 'Admin user already exists — you can log in now',
        email: existing.email,
      });
    }

    // Hash password and create admin
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: 'Admin',
      },
    });

    return NextResponse.json({
      message: 'Admin user created successfully — you can now log in at /admin/login',
      email: admin.email,
    }, { status: 201 });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed admin user', details: String(error) },
      { status: 500 }
    );
  }
}

// Support GET so you can just visit the URL in your browser
export async function GET() {
  return POST();
}
