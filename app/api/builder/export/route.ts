import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  xIn: z.number(),
  yIn: z.number(),
  widthIn: z.number(),
  heightIn: z.number(),
  rotation: z.number(),
  type: z.enum(['upload', 'library'])
});

const payloadSchema = z.object({
  dataUrl: z.string(),
  sheetHeightIn: z.number(),
  items: z.array(itemSchema)
});

export async function POST(request: Request) {
  const body = payloadSchema.parse(await request.json());
  const matches = body.dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!matches) {
    return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 });
  }
  const [, contentType, base64] = matches;
  const buffer = Buffer.from(base64, 'base64');
  const key = `exports/${Date.now()}-gang-sheet.png`;
  await uploadBuffer(key, buffer, contentType);

  const order = await prisma.order.create({
    data: {
      status: 'UNPAID',
      type: 'GANG_SHEET',
      exportKey: key,
      items: {
        create: body.items.map((item) => ({
          sourceType: item.type === 'upload' ? 'UPLOAD' : 'LIBRARY',
          requestedWidthIn: item.widthIn,
          requestedHeightIn: item.heightIn,
          billableWidthIn: item.widthIn,
          billableHeightIn: item.heightIn,
          billableSqIn: item.widthIn * item.heightIn,
          qty: 1,
          rotationDeg: item.rotation,
          xIn: item.xIn,
          yIn: item.yIn
        }))
      }
    }
  });

  return NextResponse.json({ orderId: order.id, exportKey: key });
}
