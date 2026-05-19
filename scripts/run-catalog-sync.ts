/**
 * Sync data/products.ts → PostgreSQL (same logic as POST /api/admin/catalog/sync).
 *
 * Usage: npx tsx scripts/run-catalog-sync.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { products } = await import('../data/products');
  const { prisma } = await import('../src/lib/db');
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
  }

  console.log(`Syncing ${products.length} products to database...`);
  const started = Date.now();

  let upsertedProducts = 0;
  let upsertedVariants = 0;

  for (const p of products) {
    if (!p.variants?.length) {
      console.warn(`Skip ${p.slug}: no variants`);
      continue;
    }

    const priced = p.variants
      .map((v) => v.priceCHF)
      .filter((x): x is number => x != null && x > 0);
    const basePriceCents = priced.length ? Math.round(Math.min(...priced) * 100) : 0;

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
      const priceCents =
        v.priceCHF != null && v.priceCHF > 0 ? Math.round(v.priceCHF * 100) : null;
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
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
          sku: v.sku,
          size: v.size,
          color: v.color,
          currency: 'CHF',
          priceOverride: priceCents,
          stockQuantity: v.stock,
        },
      });
      upsertedVariants++;
    }

    if (upsertedProducts % 50 === 0) {
      console.log(`  …${upsertedProducts} products`);
    }
  }

  const sec = ((Date.now() - started) / 1000).toFixed(1);
  console.log('Done.');
  console.log({ upsertedProducts, upsertedVariants, seconds: sec });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../src/lib/db');
    await prisma.$disconnect();
  });
