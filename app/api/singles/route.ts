import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  computeBillableDimensions,
  selectTier,
  subtotalCentsFromAreaUnits
} from '@/lib/pricing';
import { uploadBuffer } from '@/lib/storage';
import sharp from 'sharp';

const payloadSchema = z.array(
  z.object({
    id: z.string(),
    widthIn: z.number().positive(),
    heightIn: z.number().positive(),
    qty: z.number().int().positive()
  })
);

export async function POST(request: Request) {
  const formData = await request.formData();
  const payloadRaw = formData.get('payload');
  if (typeof payloadRaw !== 'string') {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }
  const payload = payloadSchema.parse(JSON.parse(payloadRaw));
  const files = formData.getAll('files');

  const settings = await prisma.settings.findFirst();
  const tiers = await prisma.pricingTier.findMany({ orderBy: { sortOrder: 'asc' } });

  const uploadRecords = [];
  for (const [index, file] of files.entries()) {
    if (!(file instanceof File)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const key = `uploads/${Date.now()}-${file.name}`;
    await uploadBuffer(key, buffer, file.type || 'image/png');
    const upload = await prisma.upload.create({
      data: {
        originalKey: key,
        filename: file.name,
        widthPx: metadata.width ?? 0,
        heightPx: metadata.height ?? 0
      }
    });
    uploadRecords[index] = upload;
  }

  const pricingSettings = {
    roundingIncrementIn: settings?.roundingIncrementIn ?? 0.25,
    minWidthIn: settings?.minWidthIn ?? 2,
    minHeightIn: settings?.minHeightIn ?? 2,
    minBillableSqIn: settings?.minBillableSqIn ?? 4
  };

  const itemsData = payload.map((item, index) => {
    const billable = computeBillableDimensions(
      item.widthIn,
      item.heightIn,
      pricingSettings
    );
    return {
      sourceType: 'UPLOAD' as const,
      uploadId: uploadRecords[index]?.id,
      requestedWidthIn: item.widthIn,
      requestedHeightIn: item.heightIn,
      billableWidthIn: billable.billableWidthIn,
      billableHeightIn: billable.billableHeightIn,
      billableSqIn: billable.billableSqIn,
      qty: item.qty,
      rotationDeg: 0,
      areaUnits: billable.areaUnits
    };
  });

  const totalSqIn = itemsData.reduce(
    (sum, item) => sum + item.billableSqIn * item.qty,
    0
  );
  const totalAreaUnits = itemsData.reduce(
    (sum, item) => sum + item.areaUnits * item.qty,
    0
  );
  const tier = tiers.length > 0 ? selectTier(totalSqIn, tiers) : null;
  const subtotalCents = tier
    ? subtotalCentsFromAreaUnits(
        totalAreaUnits,
        pricingSettings.roundingIncrementIn,
        tier.ratePerSqIn
      )
    : 0;

  const order = await prisma.order.create({
    data: {
      status: 'UNPAID',
      type: 'SINGLES',
      totalSqIn,
      tierRate: tier?.ratePerSqIn ?? null,
      subtotalCents,
      items: {
        create: itemsData.map(({ areaUnits, ...item }) => item)
      }
    }
  });

  return NextResponse.json({ orderId: order.id, subtotalCents });
}
