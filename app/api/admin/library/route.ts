import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';
import sharp from 'sharp';

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = String(formData.get('title') ?? '');
  const category = String(formData.get('category') ?? '');
  const tagsRaw = String(formData.get('tags') ?? '');
  const file = formData.get('file');

  if (!title || !(file instanceof File)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const settings = await prisma.settings.findFirst();
  const watermarkText = settings?.watermarkText ?? 'WALL2WALLDTF';
  const previewMaxPx = settings?.previewMaxPx ?? 1200;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1200;
  const height = metadata.height ?? 1200;

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="watermark" width="200" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <text x="0" y="60" fill="rgba(255,255,255,0.25)" font-size="32" font-family="Arial">${watermarkText}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#watermark)" />
  </svg>`;

  const preview = await image
    .resize({
      width: width > height ? previewMaxPx : undefined,
      height: height >= width ? previewMaxPx : undefined,
      fit: 'inside'
    })
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .png()
    .toBuffer();

  const originalKey = `library/original/${Date.now()}-${file.name}`;
  const previewKey = `library/preview/${Date.now()}-${file.name}`;
  await uploadBuffer(originalKey, buffer, file.type || 'image/png');
  await uploadBuffer(previewKey, preview, 'image/png');

  await prisma.asset.create({
    data: {
      title,
      category: category || null,
      tags: tagsRaw
        ? tagsRaw.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
      originalKey,
      previewKey
    }
  });

  return NextResponse.redirect(new URL('/admin/library', request.url));
}
