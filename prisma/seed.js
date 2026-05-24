const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');
// Single source of truth for editable content keys + their default copy.
// Shared with the runtime fallback in src/lib/content.ts so the two never drift.
const { blocks: contentBlocks } = require('../src/lib/content-blocks.json');

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
      description: 'Tuesday–Thursday evenings at Wilbur Cross High School. 8 weeks of competitive and recreational play across Beginner, Intermediate A, Intermediate B, and Advanced divisions. In partnership with New Haven Youth & Recreation.',
      season: 'Spring',
      year: 2026,
      startDate: new Date('2026-05-06'),
      endDate: new Date('2026-06-24'),
      registrationOpen: new Date('2026-03-15'),
      registrationClose: new Date('2026-04-30'),
      price: 30.00,
      currency: 'USD',
      maxBeginner: 30,
      maxIntermediateA: 30,
      maxIntermediateB: 30,
      maxAdvanced: 30,
      isActive: true,
      location: 'Wilbur Cross High School',
      dayOfWeek: 'Tuesday–Thursday Evenings',
    },
  });
  console.log(`✓ Event upserted: ${event.name}`);

  // ─── Editable Content Blocks ──────────────────────────────────────
  // Upsert each block by its stable `key`. On update we intentionally do
  // NOT overwrite `value` — re-seeding must never clobber edits an admin
  // has made. We only keep the page/label/format metadata in sync.
  for (const block of contentBlocks) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      update: {
        page: block.page,
        label: block.label,
        format: block.format,
      },
      create: {
        key: block.key,
        page: block.page,
        label: block.label,
        value: block.value,
        format: block.format,
      },
    });
  }
  console.log(`✓ Content blocks upserted: ${contentBlocks.length}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
