import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/storage';

export default async function AdminLibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
  const assetsWithUrls = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      previewUrl: await getSignedDownloadUrl(asset.previewKey).catch(() => null)
    }))
  );

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Library Manager</h1>
      <form
        action="/api/admin/library"
        method="post"
        encType="multipart/form-data"
        className="space-y-4 rounded border bg-white p-4"
      >
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Category</label>
            <input
              name="category"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tags (comma separated)</label>
            <input
              name="tags"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">PNG Upload</label>
          <input name="file" type="file" accept="image/png" required />
        </div>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">
          Upload Asset
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {assetsWithUrls.map(({ asset, previewUrl }) => (
          <div key={asset.id} className="rounded border bg-white p-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={asset.title} className="h-40 w-full object-contain" />
            ) : (
              <div className="h-40 w-full rounded bg-slate-100" />
            )}
            <div className="mt-2">
              <p className="font-medium">{asset.title}</p>
              <p className="text-xs text-slate-500">{asset.category}</p>
              <p className="text-xs text-slate-500">{asset.tags.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
