const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ─── Admin User ───────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in your .env');
  }

  const passwordHash = await bcryptjs.hash(adminPassword, 12);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash, name: 'League Admin' },
  });
  console.log(`✓ Admin user upserted: ${adminEmail}`);

  // ─── Spring League 2026 Event ─────────────────────────────────────
  const event = await prisma.event.upsert({
    where: { id: 'spring-2026' },
    update: {},
    create: {
      id: 'spring-2026',
      name: 'Spring League 2026',
      description: 'Tuesday–Thursday evenings at Wilbur Cross High School. 8 weeks of competitive and recreational play across Beginner, Intermediate, and Advanced divisions. In partnership with New Haven Youth & Recreation.',
      season: 'Spring',
      year: 2026,
      startDate: new Date('2026-05-06'),
      endDate: new Date('2026-06-24'),
      registrationOpen: new Date('2026-03-15'),
      registrationClose: new Date('2026-04-30'),
      price: 30.00,
      currency: 'USD',
      maxCapacity: 120,
      isActive: true,
      location: 'Wilbur Cross High School',
      dayOfWeek: 'Tuesday–Thursday Evenings',
    },
  });
  console.log(`✓ Event upserted: ${event.name}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
