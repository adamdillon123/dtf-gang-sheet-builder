import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      <h1 className="text-2xl font-semibold">Settings & Pricing</h1>
      <form action="/api/admin/settings" method="post" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Safe Margin (in)</label>
            <input
              name="safeMarginIn"
              type="number"
              step="0.01"
              defaultValue={settings?.safeMarginIn ?? 0.15}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Spacing (in)</label>
            <input
              name="spacingIn"
              type="number"
              step="0.01"
              defaultValue={settings?.spacingIn ?? 0.1}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Grid Size (in)</label>
            <input
              name="gridIn"
              type="number"
              step="0.01"
              defaultValue={settings?.gridIn ?? 0.25}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Max Batch Length (in)</label>
            <input
              name="maxBatchLengthIn"
              type="number"
              step="0.01"
              defaultValue={settings?.maxBatchLengthIn ?? 60}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Watermark Text</label>
            <input
              name="watermarkText"
              type="text"
              defaultValue={settings?.watermarkText ?? 'WALL2WALLDTF'}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Preview Max Px</label>
            <input
              name="previewMaxPx"
              type="number"
              defaultValue={settings?.previewMaxPx ?? 1200}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Rounding Increment (in)</label>
            <input
              name="roundingIncrementIn"
              type="number"
              step="0.01"
              defaultValue={settings?.roundingIncrementIn ?? 0.25}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Width (in)</label>
            <input
              name="minWidthIn"
              type="number"
              step="0.01"
              defaultValue={settings?.minWidthIn ?? 2}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Height (in)</label>
            <input
              name="minHeightIn"
              type="number"
              step="0.01"
              defaultValue={settings?.minHeightIn ?? 2}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Billable Sq In</label>
            <input
              name="minBillableSqIn"
              type="number"
              step="0.01"
              defaultValue={settings?.minBillableSqIn ?? 4}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </div>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">
          Save Settings
        </button>
      </form>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Pricing Tiers</h2>
        <form action="/api/admin/pricing" method="post" className="space-y-2">
          {tiers.map((tier) => (
            <div key={tier.id} className="grid gap-2 md:grid-cols-4">
              <input type="hidden" name="tierId" value={tier.id} />
              <input
                name="minSqIn"
                type="number"
                step="0.01"
                defaultValue={tier.minSqIn}
                className="rounded border px-2 py-1"
              />
              <input
                name="maxSqIn"
                type="number"
                step="0.01"
                defaultValue={tier.maxSqIn ?? ''}
                className="rounded border px-2 py-1"
                placeholder="Infinity"
              />
              <input
                name="ratePerSqIn"
                type="number"
                step="0.01"
                defaultValue={tier.ratePerSqIn}
                className="rounded border px-2 py-1"
              />
              <input
                name="sortOrder"
                type="number"
                defaultValue={tier.sortOrder}
                className="rounded border px-2 py-1"
              />
            </div>
          ))}
          <button className="rounded bg-slate-900 px-4 py-2 text-white">
            Update Tiers
          </button>
        </form>
      </div>
    </section>
  );
}
