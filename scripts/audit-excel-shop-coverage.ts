/**
 * Uporedi Tabela Cene.xlsx (kolona C) sa shop prikazom.
 * npx tsx scripts/audit-excel-shop-coverage.ts
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { products } from '../data/products';
import { isOnExcelPriceList } from '../src/lib/excelCatalog';
import { productHasPrice } from '../src/lib/productPrice';
import {
  excelPricedProductSlugs,
  matchProductsForExcelRow,
  type ExcelPriceRow,
} from '../src/lib/excelCatalogMatch';

const EXCEL_PATH = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;
const OUT = join(__dirname, 'excel-shop-coverage-report.json');

function loadExcel(): ExcelPriceRow[] {
  const py = join(__dirname, 'read-excel-prices.py');
  const raw = execSync(`python "${py}" "${EXCEL_PATH}"`, { encoding: 'utf8' });
  return (JSON.parse(raw) as ExcelPriceRow[]).filter(
    (r) => r.naziv && Number.isFinite(r.maloprodajna)
  );
}

const excel = loadExcel();
const slugSet = new Set(excelPricedProductSlugs(products, excel));

type RowReport = {
  broj: string;
  naziv: string;
  maloprodajna: number;
  matchedSlugs: string[];
  inShop: string[];
  missingFromShop: string[];
  noPriceInCatalog: string[];
  notInCatalog: boolean;
};

const rows: RowReport[] = [];

for (const row of excel) {
  const matched = matchProductsForExcelRow(row, products);
  const canonical = matched.filter((p) => !p.slug.startsWith('alpen-komfort-'));
  const pool = canonical.length ? canonical : matched;

  const inShop = pool.filter((p) => productHasPrice(p)).map((p) => p.slug);
  const onListNotPriced = pool
    .filter((p) => isOnExcelPriceList(p) && !productHasPrice(p))
    .map((p) => p.slug);
  const matchedSlugs = [...new Set(pool.map((p) => p.slug))].sort();
  const missingFromShop = matchedSlugs.filter(
    (s) => !inShop.includes(s) && slugSet.has(s)
  );

  rows.push({
    broj: row.broj,
    naziv: row.naziv,
    maloprodajna: row.maloprodajna,
    matchedSlugs,
    inShop,
    missingFromShop: [...missingFromShop, ...onListNotPriced],
    noPriceInCatalog: pool
      .filter((p) => !p.variants.some((v) => v.priceCHF != null && v.priceCHF > 0))
      .map((p) => p.slug),
    notInCatalog: matchedSlugs.length === 0,
  });
}

const problems = rows.filter(
  (r) => r.notInCatalog || r.inShop.length === 0 || r.missingFromShop.length > 0
);

writeFileSync(
  OUT,
  JSON.stringify({ excelRows: excel.length, problemCount: problems.length, problems, all: rows }, null, 2)
);

console.log(`Excel redova: ${excel.length}`);
console.log(`Slugova na shop listi: ${slugSet.size}`);
console.log(`Problema: ${problems.length}`);
for (const p of problems) {
  console.log(
    `  ${p.broj} ${p.naziv} (${p.maloprodajna} CHF) — shop: ${p.inShop.join(', ') || 'NEMA'} | matched: ${p.matchedSlugs.join(', ') || 'nema'}`
  );
}
