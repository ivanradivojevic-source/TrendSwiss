import type { Product, ProductVariant } from '@/data/products';
import { HIDE_PRICES } from '@/src/lib/catalogMode';
import { isOnExcelPriceList } from '@/src/lib/excelCatalog';

function rawVariantPriceCHF(v: ProductVariant): number | null {
  if (v.priceCHF == null || !Number.isFinite(v.priceCHF) || v.priceCHF <= 0) return null;
  return v.priceCHF;
}

/** Cena varijante — samo za proizvode na Excel listi. */
export function variantPriceCHF(v: ProductVariant, product?: Product): number | null {
  if (HIDE_PRICES) return null;
  if (product && !isOnExcelPriceList(product)) return null;
  return rawVariantPriceCHF(v);
}

/** Model je na Excel listi i ima bar jednu cenu. */
export function productHasPrice(product: Product): boolean {
  if (!isOnExcelPriceList(product)) return false;
  return product.variants.some((v) => rawVariantPriceCHF(v) != null);
}

export function productPriceRange(product: Product): { min: number; max: number } | null {
  if (HIDE_PRICES) return null;
  if (!isOnExcelPriceList(product)) return null;
  const prices = product.variants
    .map((v) => rawVariantPriceCHF(v))
    .filter((p): p is number => p != null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatPriceRange(
  range: { min: number; max: number } | null,
  currencyLabel: string
): string | null {
  if (!range) return null;
  if (range.min === range.max) return `${currencyLabel} ${formatChf(range.min)}`;
  return `${currencyLabel} ${formatChf(range.min)} – ${formatChf(range.max)}`;
}

/** Jedinstven prikaz cene u shop gridu i na PDP (samo Excel lista). */
export function formatProductPriceLabel(
  product: Product,
  currencyLabel: string
): string | null {
  return formatPriceRange(productPriceRange(product), currencyLabel);
}

export function formatChf(amount: number): string {
  return amount.toFixed(2);
}
