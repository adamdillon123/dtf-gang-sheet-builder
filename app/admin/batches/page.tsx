import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/storage';

export default async function AdminBatchesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const batches = await prisma.batchSheet.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  const batchLinks = await Promise.all(
  batches.map(async (batch) => ({
    batch,
    url: await getSignedDownloadUrl(batch.exportKey).catch(() => null),
  }))
);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Batch Sheets</h1>
      <div className="space-y-4">
        {batchLinks.length === 0 ? (
          <p className="text-slate-600">No batch sheets yet.</p>
        ) : (
          batchLinks.map(({ batch, url }) => (
            <div key={batch.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Batch {batch.id}</p>
                  <p className="text-sm text-slate-600">
                    Length {batch.lengthIn}" · Items {batch.items.length}
                  </p>
                </div>
                {url ? (
                  <a className="text-sm text-blue-600" href={url}>
                    Download
                  </a>
                ) : (
                  <span className="text-sm text-slate-500">No export URL</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
