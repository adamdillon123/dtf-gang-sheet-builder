import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { getObjectBuffer, uploadBuffer } from '@/lib/storage';

const DPI = 300;
const SHEET_WIDTH_IN = 22.5;

export async function POST(request: Request) {
  const settings = await prisma.settings.findFirst();
  const maxLength = settings?.maxBatchLengthIn ?? 60;
  const spacing = settings?.spacingIn ?? 0.1;
  const margin = settings?.safeMarginIn ?? 0.15;

  const queueItems = await prisma.orderItem.findMany({
    where: { order: { type: 'SINGLES' }, batchSheetItem: null },
    include: { upload: true, asset: true },
    orderBy: { requestedHeightIn: 'desc' }
  });

  if (queueItems.length === 0) {
    return NextResponse.redirect(new URL('/admin/queue', request.url));
  }

  const placements: {
    itemId: string;
    xIn: number;
    yIn: number;
    widthIn: number;
    heightIn: number;
    buffer: Buffer;
  }[] = [];

  let cursorX = margin;
  let cursorY = margin;
  let rowHeight = 0;

  for (const item of queueItems) {
    const widthIn = item.requestedWidthIn;
    const heightIn = item.requestedHeightIn;

    if (cursorX + widthIn + margin > SHEET_WIDTH_IN) {
      cursorX = margin;
      cursorY += rowHeight + spacing;
      rowHeight = 0;
    }

    if (cursorY + heightIn + margin > maxLength) {
      break;
    }

    const key = item.upload?.originalKey ?? item.asset?.originalKey;
    if (!key) continue;
    const buffer = await getObjectBuffer(key);

    placements.push({
      itemId: item.id,
      xIn: cursorX,
      yIn: cursorY,
      widthIn,
      heightIn,
      buffer
    });

    cursorX += widthIn + spacing;
    rowHeight = Math.max(rowHeight, heightIn);
  }

  const usedLength = Math.min(maxLength, cursorY + rowHeight + margin);

  const canvasWidthPx = Math.round(SHEET_WIDTH_IN * DPI);
  const canvasHeightPx = Math.round(usedLength * DPI);

  const composites = await Promise.all(
    placements.map(async (placement) => {
      const resized = await sharp(placement.buffer)
        .resize({
          width: Math.round(placement.widthIn * DPI),
          height: Math.round(placement.heightIn * DPI),
          fit: 'fill'
        })
        .png()
        .toBuffer();

      return {
        input: resized,
        left: Math.round(placement.xIn * DPI),
        top: Math.round(placement.yIn * DPI)
      };
    })
  );

  const base = sharp({
    create: {
      width: canvasWidthPx,
      height: canvasHeightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const output = await base.composite(composites).png().toBuffer();
  const exportKey = `batches/${Date.now()}-batch.png`;
  await uploadBuffer(exportKey, output, 'image/png');

  const batchSheet = await prisma.batchSheet.create({
    data: {
      exportKey,
      lengthIn: usedLength,
      items: {
        create: placements.map((placement) => ({
          orderItemId: placement.itemId,
          xIn: placement.xIn,
          yIn: placement.yIn,
          widthIn: placement.widthIn,
          heightIn: placement.heightIn,
          rotationDeg: 0
        }))
      }
    }
  });

  return NextResponse.redirect(new URL(`/admin/batches?batch=${batchSheet.id}`, request.url));
}
