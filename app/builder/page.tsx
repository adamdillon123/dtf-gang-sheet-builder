import BuilderClient from "@/components/builder/BuilderClient";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage";

export default async function BuilderPage() {
  const settings = await prisma.settings.findFirst();
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const assetsWithUrls = await Promise.all(
    assets.map(async (asset: typeof assets[number]) => ({
      id: asset.id,
      title: asset.title,
      previewUrl: await getSignedDownloadUrl(asset.previewKey).catch(() => null),
      originalUrl: await getSignedDownloadUrl(asset.originalKey).catch(() => null),
    }))
  );

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Gang Sheet Builder</h1>
      <BuilderClient settings={settings} assets={assetsWithUrls} />
    </section>
  );
}
