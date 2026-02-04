import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const formData = await request.formData();
  const tierIds = formData.getAll('tierId').map(String);
  const minSqIns = formData.getAll('minSqIn').map((value) => Number(value));
  const maxSqIns = formData.getAll('maxSqIn').map((value) =>
    value === '' ? null : Number(value)
  );
  const rates = formData.getAll('ratePerSqIn').map((value) => Number(value));
  const sortOrders = formData.getAll('sortOrder').map((value) => Number(value));

  await Promise.all(
    tierIds.map((id, index) =>
      prisma.pricingTier.update({
        where: { id },
        data: {
          minSqIn: minSqIns[index],
          maxSqIn: maxSqIns[index],
          ratePerSqIn: rates[index],
          sortOrder: sortOrders[index]
        }
      })
    )
  );

  return NextResponse.redirect(new URL('/admin/settings', request.url));
}
