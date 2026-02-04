import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/storage';
import QueueClient from '@/components/admin/QueueClient';

export default async function AdminQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const items = await prisma.orderItem.findMany({
    where: {
      order: { status: { in: ['UNPAID', 'PAID'] }, type: 'SINGLES' },
      batchSheetItems: { none: {} }
    },
    include: { order: true, upload: true },
    orderBy: { order: { createdAt: 'asc' } }
  });

  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      orderId: item.orderId,
      previewUrl: item.upload?.originalKey
        ? await getSignedDownloadUrl(item.upload.originalKey).catch(() => null)
        : null,
      filename: item.upload?.filename ?? 'Upload',
      requestedWidthIn: item.requestedWidthIn,
      requestedHeightIn: item.requestedHeightIn,
      qty: item.qty
    }))
  );

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Singles Print Queue</h1>
      {itemsWithUrls.length === 0 ? (
        <p className="text-slate-600">No unbatched singles items.</p>
      ) : (
        <QueueClient items={itemsWithUrls} />
      )}
    </section>
  );
}
