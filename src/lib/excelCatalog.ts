import type { Product } from '@/data/products';
import excelShopSlugs from '@/data/excel-shop-slugs.json';

const EXCEL_SLUGS = new Set(excelShopSlugs as string[]);

/** Proizvod je na Tabela Cene.xlsx listi (sme imati cenu u shopu). */
export function isOnExcelPriceList(product: Product): boolean {
  return EXCEL_SLUGS.has(product.slug);
}

export function excelPriceListSlugCount(): number {
  return EXCEL_SLUGS.size;
}
