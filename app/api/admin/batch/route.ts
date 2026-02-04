import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getObjectBuffer, uploadBuffer } from '@/lib/storage';

const DPI = 300;
const SHEET_WIDTH_IN = 22.5;

const payloadSchema = z.object({
  orderItemIds: z.array(z.string()).optional()
});

type Placement = {
  orderItemId: string;
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
  buffer: Buffer;
};

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json().catch(() => ({ orderItemIds: [] })));
  const settings = await prisma.settings.findFirst();
  const maxLength = settings?.maxBatchLengthIn ?? 60;
  const spacing = settings?.spacingIn ?? 0.1;
  const margin = settings?.safeMarginIn ?? 0.15;

  const queueItems = await prisma.orderItem.findMany({
    where: {
      order: { status: { in: ['UNPAID', 'PAID'] }, type: 'SINGLES' },
      batchSheetItems: { none: {} },
      ...(payload.orderItemIds && payload.orderItemIds.length > 0
        ? { id: { in: payload.orderItemIds } }
        : {})
    },
    include: { upload: true },
    orderBy: { requestedHeightIn: 'desc' }
  });

  if (queueItems.length === 0) {
    return NextResponse.json({ error: 'No eligible items to batch.' }, { status: 400 });
  }

  const expandedItems = queueItems.flatMap((item) =>
    Array.from({ length: item.qty }, (_, index) => ({
      orderItemId: item.id,
      widthIn: item.requestedWidthIn,
      heightIn: item.requestedHeightIn,
      key: item.upload?.originalKey,
      label: `${item.id}-${index}`
    }))
  );

  expandedItems.sort((a, b) => b.heightIn - a.heightIn || a.label.localeCompare(b.label));

  const placements: Placement[] = [];
  let cursorX = margin;
  let cursorY = margin;
  let rowHeight = 0;

  for (const item of expandedItems) {
    if (!item.key) continue;
    const widthIn = item.widthIn;
    const heightIn = item.heightIn;

    if (cursorX + widthIn + margin > SHEET_WIDTH_IN) {
      cursorX = margin;
      cursorY += rowHeight + spacing;
      rowHeight = 0;
    }

    if (cursorY + heightIn + margin > maxLength) {
      break;
    }

    const buffer = await getObjectBuffer(item.key);

    placements.push({
      orderItemId: item.orderItemId,
      xIn: cursorX,
      yIn: cursorY,
      widthIn,
      heightIn,
      buffer
    });

    cursorX += widthIn + spacing;
    rowHeight = Math.max(rowHeight, heightIn);
  }

  if (placements.length === 0) {
    return NextResponse.json({ error: 'Unable to place any items on the sheet.' }, { status: 400 });
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
          orderItemId: placement.orderItemId,
          xIn: placement.xIn,
          yIn: placement.yIn,
          widthIn: placement.widthIn,
          heightIn: placement.heightIn,
          rotationDeg: 0
        }))
      }
    }
  });

  return NextResponse.json({ redirectUrl: `/admin/batches?batch=${batchSheet.id}` });
}
