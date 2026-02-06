import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getObjectBuffer, getSignedDownloadUrl, uploadBuffer } from '@/lib/storage';
import BatchActionsClient from '@/components/admin/BatchActionsClient';

const SHEET_WIDTH_IN = 22.5;

async function ensureThumbnail(exportKey: string, existingKey: string | null) {
  if (existingKey) return existingKey;
  const buffer = await getObjectBuffer(exportKey);
  const thumbnail = await sharp(buffer).resize({ width: 600 }).png().toBuffer();
  const thumbKey = `batches/thumbnails/${Date.now()}-thumb.png`;
  await uploadBuffer(thumbKey, thumbnail, 'image/png');
  return thumbKey;
}

export default async function BatchDetailPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const batch = await prisma.batchSheet.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          orderItem: {
            include: { order: true, upload: true }
          }
        }
      }
    }
  });

  if (!batch) {
    redirect('/admin/batches');
  }

  const settings = await prisma.settings.findFirst();

  const thumbnailKey = batch.exportKey
    ? await ensureThumbnail(batch.exportKey, batch.thumbnailKey).catch(() => null)
    : null;

  if (thumbnailKey && thumbnailKey !== batch.thumbnailKey) {
    await prisma.batchSheet.update({
      where: { id: batch.id },
      data: { thumbnailKey }
    });
  }

  const previewUrl = thumbnailKey
    ? await getSignedDownloadUrl(thumbnailKey).catch(() => null)
    : null;
  const downloadUrl = batch.exportKey
    ? await getSignedDownloadUrl(batch.exportKey).catch(() => null)
    : null;

  const placements = await Promise.all(
    batch.items.map(async (item: any) => ({
      ...item,
      previewUrl: item.orderItem.upload?.originalKey
        ? await getSignedDownloadUrl(item.orderItem.upload.originalKey).catch(() => null)
        : null
    }))
  );

  const orderSummary = placements.reduce<Record<string, number>>((acc, item) => {
    acc[item.orderItem.orderId] = (acc[item.orderItem.orderId] ?? 0) + 1;
    return acc;
  }, {});

  const itemSummary = placements.reduce<Record<string, number>>((acc, item) => {
  acc[item.orderItemId] = (acc[item.orderItemId] ?? 0) + 1;
  return acc;
}, Object.create(null) as Record<string, number>);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Batch {batch.id.slice(0, 8)}</h1>
        <Link href="/admin/batches" className="text-sm text-blue-600">
          Back to batches
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Batch Metadata</h2>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd>{batch.createdAt.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Width</dt>
              <dd>{SHEET_WIDTH_IN}"</dd>
            </div>
            <div>
              <dt className="text-slate-500">Length</dt>
              <dd>{batch.lengthIn.toFixed(2)}"</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>{batch.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Spacing</dt>
              <dd>{settings?.spacingIn ?? 0.1}"</dd>
            </div>
            <div>
              <dt className="text-slate-500">Safe Margin</dt>
              <dd>{settings?.safeMarginIn ?? 0.15}"</dd>
            </div>
          </dl>

          <BatchActionsClient batchId={batch.id} status={batch.status}
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">Export Preview</h2>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Batch preview" className="w-full rounded border" />
          ) : (
            <p className="text-sm text-slate-500">No preview available.</p>
          )}
          {downloadUrl ? (
            <a href={downloadUrl} className="text-sm text-blue-600">
              Download PNG
            </a>
          ) : (
            <p className="text-sm text-slate-500">Export not available.</p>
          )}
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Included Orders</h2>
        <div className="mt-3 grid gap-2">
          {Object.entries(orderSummary).map(([orderId, count]) => (
            <div key={orderId} className="flex items-center justify-between text-sm">
              <span className="font-mono">{orderId}</span>
              <span>{count} placements</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Placements</h2>
        <div className="mt-4 space-y-3">
          {placements.map((placement) => (
            <div key={placement.id} className="flex flex-wrap items-center justify-between gap-4 rounded border p-3">
              <div className="flex items-center gap-4">
                {placement.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={placement.previewUrl}
                    alt="Placement preview"
                    className="h-16 w-16 rounded border object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 rounded border bg-slate-100" />
                )}
                <div>
                  <p className="text-sm font-medium">Order {placement.orderItem.orderId}</p>
                  <p className="text-xs text-slate-600">
                    Item {placement.orderItemId} · {placement.orderItem.requestedWidthIn}" ×{' '}
                    {placement.orderItem.requestedHeightIn}"
                  </p>
                  <p className="text-xs text-slate-500">
                    Placements for item: {itemSummary[placement.orderItemId]}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-600">
                x {placement.xIn.toFixed(2)}" y {placement.yIn.toFixed(2)}" ·
                {placement.widthIn.toFixed(2)}" × {placement.heightIn.toFixed(2)}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
