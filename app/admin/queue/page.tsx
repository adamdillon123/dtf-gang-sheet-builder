import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const items = await prisma.orderItem.findMany({
    where: { order: { type: 'SINGLES' }, batchSheetItem: null },
    include: { order: true, upload: true, asset: true },
    orderBy: { order: { createdAt: 'asc' } }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Singles Print Queue</h1>
      <form action="/api/admin/batch" method="post">
        <button className="rounded bg-slate-900 px-4 py-2 text-white">
          Generate Batch Sheet
        </button>
      </form>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-slate-600">No unbatched singles items.</p>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order {item.orderId}</p>
                  <p className="text-sm text-slate-600">
                    {item.requestedWidthIn}" × {item.requestedHeightIn}" · Qty {item.qty}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {item.upload?.filename ?? item.asset?.title ?? 'Item'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
