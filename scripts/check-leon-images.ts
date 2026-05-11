import { leonProducts } from '@/data/leon-products.generated';

const counts = new Map<number, number>();
let max = 0;
let sample: { slug: string; n: number; images?: string[] } | null = null;

for (const p of leonProducts as any[]) {
  const n = (p.images?.length ?? 0) + 0;
  counts.set(n, (counts.get(n) ?? 0) + 1);
  if (n > max) {
    max = n;
    sample = { slug: p.slug, n, images: p.images };
  }
}

console.log('distribution(images.length):', Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0])));
console.log('max images:', max);
console.log('sample:', sample);

