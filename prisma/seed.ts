import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in environment variables');
  }

  // Check if admin user already exists
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin user with email ${adminEmail} already exists. Skipping seed.`);
    return;
  }

  // Hash password with bcryptjs cost 12
  const passwordHash = await bcryptjs.hash(adminPassword, 12);

  // Create admin user
  const adminUser = await prisma.adminUser.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
    },
  });

  console.log(`✓ Admin user created: ${adminUser.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
