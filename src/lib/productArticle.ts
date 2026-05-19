import type { Product } from '@/data/products';
import { leonColorLabelForLocale, type Loc } from '@/data/leonMultiLocale';

/** Prikaz kao na leon.rs: „3500“ ili „6016 · Crna“. */
export function formatArticleLine(product: Product): string | null {
  if (!product.articleNumber) return null;
  if (product.colorLabel) return `${product.articleNumber} · ${product.colorLabel}`;
  return product.articleNumber;
}

/** Isti broj artikla za sve boje jednog modela (kao na leon.rs). */
export function resolveArticleNumber(
  product: Product,
  siblings: Product[] = []
): string | undefined {
  if (product.articleNumber) return product.articleNumber;
  return siblings.find((s) => s.articleNumber)?.articleNumber;
}

export function formatArticleLineForProduct(
  product: Product,
  siblings: Product[] = []
): string | null {
  const broj = resolveArticleNumber(product, siblings);
  if (!broj) return null;
  return formatArticleLine({ ...product, articleNumber: broj });
}

/** Boja za UI (izbor boja) — prevedeno, ne BEZ/BRAON sa leon.rs. */
export function localizedColorDisplayName(product: Product, loc: Loc): string | null {
  const fromLabel = leonColorLabelForLocale(product.colorLabel, loc);
  if (fromLabel) return fromLabel;
  const tail = product.name[loc]?.split(/\s*[–—]\s*/).pop()?.trim();
  return tail || product.colorLabel || null;
}

/** U pickeru boja: „7010 · Beige“, ne „7010 · BEZ“. */
export function formatColorPickerArticleLine(
  product: Product,
  siblings: Product[] = [],
  loc: Loc
): string | null {
  const broj = resolveArticleNumber(product, siblings);
  if (!broj) return null;
  const color = localizedColorDisplayName(product, loc);
  return color ? `${broj} · ${color}` : broj;
}
