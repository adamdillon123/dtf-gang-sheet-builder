import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await prisma.builderSession.findUnique({
    where: { id: params.id }
  });
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: session.id,
    status: session.status,
    exportKey: session.exportKey
  });
}
