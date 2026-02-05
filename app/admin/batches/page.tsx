import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/storage';

const PAGE_SIZE = 15;

export default async function AdminBatchesPage({
  searchParams
}: {
  searchParams: { page?: string; showArchived?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const page = Number(searchParams.page ?? '1');
  const showArchived = searchParams.showArchived === 'true';

  const batches = await prisma.batchSheet.findMany({
    where: showArchived ? {} : { status: { not: 'ARCHIVED' } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { items: true } } }
  });

  const batchLinks = await Promise.all(
    batches.map(async (batch) => ({
      batch,
      url: batch.exportKey
        ? await getSignedDownloadUrl(batch.exportKey).catch(() => null)
        : null
    }))
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Batch Sheets</h1>
        <Link
          href={`/admin/batches?showArchived=${showArchived ? 'false' : 'true'}`}
          className="text-sm text-blue-600"
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Link>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Batch ID</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Length (in)</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {batchLinks.map(({ batch, url }) => (
              <tr key={batch.id}>
                <td className="px-4 py-2 font-mono text-xs">
                  {batch.id.slice(0, 8)}
                </td>
                <td className="px-4 py-2">
                  {batch.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2">{batch.lengthIn.toFixed(2)}</td>
                <td className="px-4 py-2">{batch._count.items}</td>
                <td className="px-4 py-2">{batch.status}</td>
                <td className="px-4 py-2 space-x-2">
                  {url ? (
                    <a className="text-blue-600" href={url}>
                      Download
                    </a>
                  ) : (
                    <span className="text-slate-400">No export</span>
                  )}
                  <Link className="text-blue-600" href={`/admin/batches/${batch.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link
          href={`/admin/batches?page=${Math.max(page - 1, 1)}&showArchived=${showArchived}`}
          className={page <= 1 ? 'pointer-events-none text-slate-400' : 'text-blue-600'}
        >
          Previous
        </Link>
        <span>Page {page}</span>
        <Link
          href={`/admin/batches?page=${page + 1}&showArchived=${showArchived}`}
          className={batchLinks.length < PAGE_SIZE ? 'pointer-events-none text-slate-400' : 'text-blue-600'}
        >
          Next
        </Link>
      </div>
    </section>
  );
}
