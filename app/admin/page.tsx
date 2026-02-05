import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const [ordersCount, queueCount, assetsCount] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count({
      where: { order: { type: 'SINGLES' }, batchSheetItems: { none: {} } }
    }),
    prisma.asset.count()
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link href="/api/auth/signout" className="text-sm text-slate-600">
          Sign out
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-500">Orders</p>
          <p className="text-2xl font-semibold">{ordersCount}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-500">Singles Queue</p>
          <p className="text-2xl font-semibold">{queueCount}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-500">Library Assets</p>
          <p className="text-2xl font-semibold">{assetsCount}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/queue" className="rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Singles Print Queue</h2>
          <p className="text-sm text-slate-600">
            Batch single transfers onto 22.5&quot; sheets.
          </p>
        </Link>
        <Link href="/admin/batches" className="rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Batch Sheets</h2>
          <p className="text-sm text-slate-600">Review generated batch exports.</p>
        </Link>
        <Link href="/admin/settings" className="rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Settings & Pricing</h2>
          <p className="text-sm text-slate-600">Manage pricing tiers and builder defaults.</p>
        </Link>
        <Link href="/admin/library" className="rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Library Manager</h2>
          <p className="text-sm text-slate-600">Upload and tag design assets.</p>
        </Link>
      </div>
    </section>
  );
}
