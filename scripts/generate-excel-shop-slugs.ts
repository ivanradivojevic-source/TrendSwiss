/**
 * Generiše data/excel-shop-slugs.json iz Tabela Cene.xlsx + trenutnog kataloga.
 * npx tsx scripts/generate-excel-shop-slugs.ts
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { products } from '../data/products';
import {
  excelPricedProductSlugs,
  type ExcelPriceRow,
} from '../src/lib/excelCatalogMatch';

const EXCEL_PATH = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;
const OUT = join(__dirname, '../data/excel-shop-slugs.json');

function loadExcel(): ExcelPriceRow[] {
  const py = join(__dirname, 'read-excel-prices.py');
  const raw = execSync(`python "${py}" "${EXCEL_PATH}"`, { encoding: 'utf8' });
  return (JSON.parse(raw) as ExcelPriceRow[]).filter(
    (r) => r.naziv && Number.isFinite(r.maloprodajna)
  );
}

const excel = loadExcel();
const slugs = excelPricedProductSlugs(products, excel);

writeFileSync(OUT, JSON.stringify(slugs, null, 2) + '\n', 'utf8');
console.log(`Excel redova: ${excel.length}, slugova u shop listi: ${slugs.length}`);
