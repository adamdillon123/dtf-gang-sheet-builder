import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage";

export default async function LibraryPage() {
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const assetsWithUrls = await Promise.all(
    assets.map(async (asset: typeof assets[number]) => ({
      asset,
      previewUrl: await getSignedDownloadUrl(asset.previewKey).catch(() => null),
    }))
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Design Library</h1>
        <Link href="/builder" className="text-sm text-blue-600">
          Open Builder
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {assetsWithUrls.map(({ asset, previewUrl }) => (
          <div key={asset.id} className="rounded border bg-white p-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={asset.title}
                className="h-40 w-full object-contain"
              />
            ) : (
              <div className="h-40 w-full rounded bg-slate-100" />
            )}
            <div className="mt-2">
              <p className="font-medium">{asset.title}</p>
              <p className="text-xs text-slate-500">{asset.category}</p>
              <p className="text-xs text-slate-500">
                {asset.tags.join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
