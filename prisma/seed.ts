import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'admin'
    }
  });

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {}
    });
  }

  const tiers = await prisma.pricingTier.count();
  if (tiers === 0) {
    await prisma.pricingTier.createMany({
      data: [
        { minSqIn: 0, maxSqIn: 100, ratePerSqIn: 0.12, sortOrder: 1 },
        { minSqIn: 101, maxSqIn: 300, ratePerSqIn: 0.1, sortOrder: 2 },
        { minSqIn: 301, maxSqIn: 600, ratePerSqIn: 0.09, sortOrder: 3 },
        { minSqIn: 601, maxSqIn: null, ratePerSqIn: 0.08, sortOrder: 4 }
      ]
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
