import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PricingSettingsClient from '@/components/admin/PricingSettingsClient';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }
  const settings = await prisma.settings.findFirst();
  const tiers = await prisma.pricingTier.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Pricing Settings</h1>
      <PricingSettingsClient
        initialSettings={{
          roundingIncrementIn: settings?.roundingIncrementIn ?? 0.25,
          minWidthIn: settings?.minWidthIn ?? 2,
          minHeightIn: settings?.minHeightIn ?? 2,
          minBillableSqIn: settings?.minBillableSqIn ?? 4
        }}
        initialTiers={tiers.map((tier) => ({
          id: tier.id,
          minSqIn: tier.minSqIn,
          maxSqIn: tier.maxSqIn,
          ratePerSqIn: tier.ratePerSqIn,
          sortOrder: tier.sortOrder
        }))}
      />
    </section>
  );
}
