import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';
import { prisma } from '@/src/lib/db';
import { products } from '@/data/products';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  return NextResponse.json({
    ok: true,
    cookiePresent: Boolean(token),
    cookieLen: token?.length ?? 0,
    sessionEmail: session?.email ?? null,
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  console.log('[admin.catalog.sync] cookiePresent=', Boolean(token), 'cookieLen=', token?.length ?? 0, 'session=', session?.email ?? null);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert products + variants by slug / sku.
  // IMPORTANT: don't use an interactive transaction for this bulk job (default timeout ~5s).
  let upsertedProducts = 0;
  let upsertedVariants = 0;
  for (const p of products) {
    const basePriceCents = Math.round(Math.min(...p.variants.map((v) => v.priceCHF)) * 100);

    const dbProduct = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name.en,
        description: p.description.en,
        currency: 'CHF',
        active: true,
        basePrice: basePriceCents,
      },
      create: {
        slug: p.slug,
        name: p.name.en,
        description: p.description.en,
        currency: 'CHF',
        active: true,
        basePrice: basePriceCents,
      },
    });
    upsertedProducts++;

    for (const v of p.variants) {
      const sku = v.sku;
      const priceCents = Math.round(v.priceCHF * 100);
      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: dbProduct.id,
          size: v.size,
          color: v.color,
          currency: 'CHF',
          priceOverride: priceCents,
          stockQuantity: v.stock,
        },
        create: {
          productId: dbProduct.id,
          sku,
          size: v.size,
          color: v.color,
          currency: 'CHF',
          priceOverride: priceCents,
          stockQuantity: v.stock,
        },
      });
      upsertedVariants++;
    }
  }

  console.log('[admin.catalog.sync] done', { upsertedProducts, upsertedVariants });

  // Send admin back to inventory page for convenience
  return NextResponse.redirect(new URL('/admin/inventory', req.url));
}

