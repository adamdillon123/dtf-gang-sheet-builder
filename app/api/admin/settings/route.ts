import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const formData = await request.formData();
  const data = {
    safeMarginIn: Number(formData.get('safeMarginIn')),
    spacingIn: Number(formData.get('spacingIn')),
    gridIn: Number(formData.get('gridIn')),
    maxBatchLengthIn: Number(formData.get('maxBatchLengthIn')),
    watermarkText: String(formData.get('watermarkText')),
    previewMaxPx: Number(formData.get('previewMaxPx')),
    roundingIncrementIn: Number(formData.get('roundingIncrementIn')),
    minWidthIn: Number(formData.get('minWidthIn')),
    minHeightIn: Number(formData.get('minHeightIn')),
    minBillableSqIn: Number(formData.get('minBillableSqIn'))
  };

  const existing = await prisma.settings.findFirst();
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.settings.create({ data });
  }

  return NextResponse.redirect(new URL('/admin/settings', request.url));
}
