import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin';

const payloadSchema = z.object({
  status: z.enum(['GENERATED', 'PRINTED', 'ARCHIVED']).optional(),
  notes: z.string().optional()
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = payloadSchema.parse(await request.json());

  const batch = await prisma.batchSheet.update({
    where: { id: params.id },
    data: {
      status: payload.status,
      notes: payload.notes
    }
  });

  return NextResponse.json({ success: true, batch });
}
