/**
 * Kompaktan indeks za brzu klijentsku pretragu (bez API round-trip).
 * npx tsx scripts/generate-product-search-index.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locale } from '../data/products';
import { products } from '../data/products';
import { formatProductPriceLabel, productHasPrice } from '../src/lib/productPrice';

export type ProductSearchIndexEntry = {
  slug: string;
  articleNumber: string | null;
  image: string;
  priceLabel: string;
  name: Record<Locale, string>;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const OUT = join(__dirname, '../data/product-search-index.json');

const index: ProductSearchIndexEntry[] = products
  .filter(productHasPrice)
  .map((p) => ({
    slug: p.slug,
    articleNumber: p.articleNumber ?? null,
    image: p.image,
    priceLabel: formatProductPriceLabel(p, 'CHF') ?? '',
    name: {
      de: p.name.de,
      fr: p.name.fr,
      en: p.name.en,
      it: p.name.it,
    },
  }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

writeFileSync(OUT, JSON.stringify(index) + '\n', 'utf8');
console.log(`Search index: ${index.length} proizvoda → ${OUT}`);
