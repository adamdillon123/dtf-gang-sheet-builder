import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const tierSchema = z.object({
  id: z.string().optional(),
  minSqIn: z.number().min(0),
  maxSqIn: z.number().nullable(),
  ratePerSqIn: z.number().positive(),
  sortOrder: z.number().int().min(1)
});

const settingsSchema = z.object({
  roundingIncrementIn: z.number().positive(),
  minWidthIn: z.number().positive(),
  minHeightIn: z.number().positive(),
  minBillableSqIn: z.number().positive()
});

const payloadSchema = z.object({
  settings: settingsSchema,
  tiers: z.array(tierSchema)
});

function validateTierRanges(tiers: z.infer<typeof tierSchema>[]) {
  if (tiers.length === 0) {
    return 'Add at least one pricing tier.';
  }
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tier of sorted) {
    if (tier.maxSqIn !== null && tier.minSqIn >= tier.maxSqIn) {
      return 'Each tier must have minSqIn < maxSqIn.';
    }
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.maxSqIn === null) {
      return 'Only the last tier can have an open-ended max.';
    }
    if (next.minSqIn !== current.maxSqIn + 1) {
      return 'Tiers must be contiguous with no gaps or overlaps.';
    }
  }
  return null;
}
type IncomingTier = {
  id?: string;
  minSqIn: number;
  maxSqIn: number;
  ratePerSqIn: number;
  sortOrder: number;
};

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  const rangeError = validateTierRanges(payload.tiers);
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 400 });
  }

  const existingSettings = await prisma.settings.findFirst();
  if (existingSettings) {
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: payload.settings
    });
  } else {
    await prisma.settings.create({ data: payload.settings });
  }  
  const existingTiers = await prisma.pricing.findMany();
const existingIds = new Set(existingTiers.map((tier: typeof existingTiers[number]) => tier.id));
  const incomingTiers = payload.tiers as IncomingTier[];
const incomingIds = new Set(
  incomingTiers
    .map((tier: IncomingTier) => tier.id)
    .filter((id): id is string => Boolean(id))
);

 const toDelete = existingTiers.filter(
  (tier: typeof existingTiers[number]) => !incomingIds.has(tier.id)
);

  await prisma.$transaction([
    ...toDelete.map((tier: Pricing) => prisma.pricing.delete({ where: { id: tier.id } })),
    ...incomingTiers.map((tier: IncomingTier) => {
      if (tier.id && existingIds.has(tier.id)) {
        return prisma.pricing.update({
          where: { id: tier.id },
          data: {
            minSqIn: tier.minSqIn,
            maxSqIn: tier.maxSqIn,
            ratePerSqIn: tier.ratePerSqIn,
            sortOrder: tier.sortOrder
          }
        });
      }
      return prisma.pricing.create({
        data: {
          minSqIn: tier.minSqIn,
          maxSqIn: tier.maxSqIn,
          ratePerSqIn: tier.ratePerSqIn,
          sortOrder: tier.sortOrder
        }
      });
    })
  ]);

  return NextResponse.json({ success: true });
}
