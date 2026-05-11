import { products } from '@/data/products';
import { getExploreCategoriesForProduct } from '@/src/lib/exploreClassifier';

type Row = {
  id: string;
  slug: string;
  brand?: string;
  category: string;
  tags: string[];
};

const rows: Row[] = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  brand: p.brand,
  category: p.category,
  tags: getExploreCategoriesForProduct(p),
}));

const counts = new Map<string, number>();
for (const r of rows) {
  for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
}

const untagged = rows.filter((r) => r.tags.length === 0);

console.log('Total products:', rows.length);
console.log('Tagged counts:', Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])));
console.log('Untagged:', untagged.length);
console.log('--- Sample untagged (up to 50) ---');
for (const r of untagged.slice(0, 50)) {
  console.log(`${r.brand ?? 'unknown'} | ${r.category} | ${r.slug} (${r.id})`);
}

