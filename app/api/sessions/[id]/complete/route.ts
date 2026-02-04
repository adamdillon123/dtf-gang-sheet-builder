import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/sessions';

const payloadSchema = z.object({
  token: z.string(),
  exportKey: z.string()
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const payload = payloadSchema.parse(await request.json());
  const session = await prisma.builderSession.findUnique({
    where: { id: params.id }
  });
  if (!session || !verifyToken(params.id, payload.token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.builderSession.update({
    where: { id: params.id },
    data: {
      status: 'COMPLETE',
      exportKey: payload.exportKey,
      completedAt: new Date()
    }
  });

  return NextResponse.json({ success: true });
}
