import SinglesClient from '@/components/singles/SinglesClient';
import { prisma } from '@/lib/prisma';

export default async function SinglesPage() {
  const settings = await prisma.settings.findFirst();
  const tiers = await prisma.pricingTier.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Single DTF Transfers</h1>
      <SinglesClient settings={settings} tiers={tiers} />
    </section>
  );
}
