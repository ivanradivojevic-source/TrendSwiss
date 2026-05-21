import type { Product, Locale } from '@/data/products';
import { formatProductPriceLabel, productHasPrice } from '@/src/lib/productPrice';

export type ProductSearchHit = {
  slug: string;
  name: string;
  articleNumber: string | null;
  image: string;
  priceLabel: string | null;
  score: number;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreProduct(query: string, p: Product, locale: Locale): number {
  const q = norm(query);
  if (!q) return 0;

  const article = p.articleNumber ? norm(p.articleNumber) : '';
  const slug = norm(p.slug);
  const names = [p.name[locale], p.name.en, p.name.de, p.name.fr, p.name.it]
    .filter(Boolean)
    .map((n) => norm(n));

  if (article && article === q) return 1000;
  if (article && article.startsWith(q)) return 900;
  if (article && article.includes(q)) return 850;

  if (slug === q) return 800;
  if (slug.includes(q)) return 700;

  for (const name of names) {
    if (name === q) return 600;
    if (name.startsWith(q)) return 550;
    const words = name.split(' ');
    if (words.some((w) => w.startsWith(q))) return 500;
    if (name.includes(q)) return 450;
  }

  return 0;
}

/** Pretraga po nazivu ili broju artikla (Excel / LEON ID). */
export function searchShopProducts(
  query: string,
  catalog: Product[],
  locale: Locale,
  options?: { limit?: number; currencyLabel?: string }
): ProductSearchHit[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const limit = options?.limit ?? 8;
  const currency = options?.currencyLabel ?? 'CHF';

  const hits: ProductSearchHit[] = [];

  for (const p of catalog) {
    if (!productHasPrice(p)) continue;
    const score = scoreProduct(q, p, locale);
    if (score <= 0) continue;

    hits.push({
      slug: p.slug,
      name: p.name[locale] ?? p.name.en,
      articleNumber: p.articleNumber ?? null,
      image: p.image,
      priceLabel: formatProductPriceLabel(p, currency),
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const seen = new Set<string>();
  const deduped: ProductSearchHit[] = [];
  for (const h of hits) {
    const key = `${h.articleNumber ?? ''}:${h.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
