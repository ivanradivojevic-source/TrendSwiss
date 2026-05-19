import type { Product } from '@/data/products';
import excelShopSlugs from '@/data/excel-shop-slugs.json';

const EXCEL_SLUGS = new Set(excelShopSlugs as string[]);

/** Leon Liora II — nije u prodaji na shop listi (samo Liora I / art. 4054). */
const SHOP_EXCLUDED_SLUGS = new Set([
  'liora-ii-zlatna',
  'liora-ii-crna',
  'liora-ii-bela',
]);

/** Proizvod je na Tabela Cene.xlsx listi (sme imati cenu u shopu). */
export function isOnExcelPriceList(product: Product): boolean {
  if (SHOP_EXCLUDED_SLUGS.has(product.slug)) return false;
  return EXCEL_SLUGS.has(product.slug);
}

export function excelPriceListSlugCount(): number {
  return EXCEL_SLUGS.size;
}
