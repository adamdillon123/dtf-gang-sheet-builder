import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/sessions';

export async function POST() {
  const session = await prisma.builderSession.create({
    data: {
      sheetHeightIn: 36,
      isAutoHeight: false,
      tokenHash: ''
    }
  });
  const token = signToken(session.id);
  await prisma.builderSession.update({
    where: { id: session.id },
    data: { tokenHash: token }
  });

  const builderUrl = `/builder?session=${session.id}&token=${token}`;

  return NextResponse.json({ sessionId: session.id, builderUrl });
}
