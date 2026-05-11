import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';
import { prisma } from '@/src/lib/db';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  console.log('[admin.inventory.adjust] cookiePresent=', Boolean(token), 'cookieLen=', token?.length ?? 0, 'session=', session?.email ?? null);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const variantId = String(form.get('variantId') || '');
  const delta = Number(form.get('delta'));
  const reason = String(form.get('reason') || '').trim() || null;

  if (!variantId || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new Error('Variant not found');

    const nextStock = variant.stockQuantity + Math.trunc(delta);
    if (nextStock < 0) throw new Error('Stock cannot go below 0');

    const v2 = await tx.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: nextStock },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId,
        type: 'manual_adjustment',
        quantityChange: Math.trunc(delta),
        reason,
      },
    });

    return v2;
  });

  return NextResponse.redirect(new URL('/admin/inventory', req.url));
}

