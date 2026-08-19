import type { Locale } from '@/data/products';
import { HIDE_PRICES } from '@/src/lib/catalogMode';

export type ProductSearchIndexEntry = {
  slug: string;
  articleNumber: string | null;
  image: string;
  priceLabel: string;
  name: Record<Locale, string>;
};

export type ProductSearchHit = {
  slug: string;
  name: string;
  articleNumber: string | null;
  image: string;
  priceLabel: string | null;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreEntry(query: string, entry: ProductSearchIndexEntry, locale: Locale): number {
  const q = norm(query);
  if (!q) return 0;

  const article = entry.articleNumber ? norm(entry.articleNumber) : '';
  const slug = norm(entry.slug);
  const names = [entry.name[locale], entry.name.en, entry.name.de, entry.name.fr, entry.name.it]
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
    if (name.split(' ').some((w) => w.startsWith(q))) return 500;
    if (name.includes(q)) return 450;
  }

  return 0;
}

/** Instant client-side search over prebuilt index. */
export function searchProductIndex(
  query: string,
  index: ProductSearchIndexEntry[],
  locale: Locale,
  limit = 8
): ProductSearchHit[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const scored: { entry: ProductSearchIndexEntry; score: number }[] = [];
  for (const entry of index) {
    const score = scoreEntry(q, entry, locale);
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const an = a.entry.name[locale] ?? a.entry.name.en;
    const bn = b.entry.name[locale] ?? b.entry.name.en;
    return an.localeCompare(bn);
  });

  const seen = new Set<string>();
  const hits: ProductSearchHit[] = [];
  for (const { entry } of scored) {
    const key = `${entry.articleNumber ?? ''}:${entry.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      slug: entry.slug,
      name: entry.name[locale] ?? entry.name.en,
      articleNumber: entry.articleNumber,
      image: entry.image,
      priceLabel: HIDE_PRICES ? null : entry.priceLabel || null,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}
