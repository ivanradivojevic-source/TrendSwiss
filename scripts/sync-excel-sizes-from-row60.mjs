/**
 * Uskladi veličine sa Tabela Cene.xlsx — od Excel reda 60 nadole (kolona A Veličine, kolona C Broj artikla).
 * Upisuje data/excel-article-sizes-from-sheet.json i patchuje data/leon-products.generated.ts.
 *
 * npx tsx scripts/sync-excel-sizes-from-row60.mjs
 * npx tsx scripts/sync-excel-sizes-from-row60.mjs --dry-run
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseExcelVelicineToSizeIds,
  rebuildProductSizes,
} from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXCEL_PATH = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;
const PY = path.join(ROOT, 'scripts', 'read-excel-prices.py');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const OUT_JSON = path.join(ROOT, 'data', 'excel-article-sizes-from-sheet.json');

const MIN_SHEET_ROW = 60;
const dryRun = process.argv.includes('--dry-run');

function loadExcelRows() {
  const raw = execSync(`python "${PY}" "${EXCEL_PATH}"`, { encoding: 'utf8' });
  return JSON.parse(raw);
}

function normalizeVariantSize(v) {
  if (typeof v.size === 'string') return v.size;
  if (v?.size && typeof v.size === 'object' && v.size.id) return String(v.size.id);
  return null;
}

function inferSkuPrefixFromVariant(sku, sizeStr) {
  const parts = String(sku).split('-');
  if (parts.length < 3) return null;
  const sizePart = parts[parts.length - 2];
  if (sizePart !== String(sizeStr)) return null;
  return parts.slice(0, -2).join('-');
}

function inferSkuPrefix(p) {
  for (const v of p.variants ?? []) {
    const sz = normalizeVariantSize(v);
    if (!sz || !/^\d{1,2}$/.test(sz)) continue;
    const pref = inferSkuPrefixFromVariant(v.sku, sz);
    if (pref) return pref;
  }
  return null;
}

function applySizesToProduct(p, sizeIds) {
  const colors = p.colors ?? [];
  if (!colors.length) {
    Object.assign(p, rebuildProductSizes(p, sizeIds));
    return 'rebuilt-no-colors';
  }
  const prefix = inferSkuPrefix(p);
  const sample = p.variants?.find((v) => normalizeVariantSize(v));
  const price =
    (typeof sample?.priceCHF === 'number' ? sample.priceCHF : null) ??
    p.variants?.find((v) => typeof v.priceCHF === 'number')?.priceCHF ??
    0;

  if (!prefix) {
    Object.assign(p, rebuildProductSizes(p, sizeIds));
    return 'rebuilt-no-prefix';
  }

  const oldVariants = p.variants ?? [];
  p.sizes = sizeIds.map((id) => ({
    id,
    label: { de: id, fr: id, en: id, it: id },
  }));
  p.variants = sizeIds.flatMap((size) =>
    colors.map((c) => {
      const old = oldVariants.find((v) => normalizeVariantSize(v) === size && v.color === c.id);
      return {
        size,
        color: c.id,
        sku: `${prefix}-${size}-${c.id}`,
        priceCHF: typeof old?.priceCHF === 'number' ? old.priceCHF : price,
        stock: typeof old?.stock === 'number' ? old.stock : 10,
      };
    })
  );
  return 'prefix-kept';
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const rows = loadExcelRows();
/** @type {Record<string, string[]>} */
const brojToSizes = {};
const skipped = [];
for (const row of rows) {
  const sr = row.sheetRow;
  if (typeof sr !== 'number' || sr < MIN_SHEET_ROW) continue;
  const broj = String(row.broj ?? '').trim();
  if (!broj) continue;
  const ids = parseExcelVelicineToSizeIds(row.velicine);
  if (!ids?.length) {
    skipped.push({ broj, sheetRow: sr, velicine: row.velicine, reason: 'parse' });
    continue;
  }
  brojToSizes[broj] = ids;
}

const notInCatalog = [];
const stats = { products: 0, byMode: { 'prefix-kept': 0, 'rebuilt-no-prefix': 0, 'rebuilt-no-colors': 0 } };

const products = loadProducts();

if (dryRun) {
  for (const broj of Object.keys(brojToSizes)) {
    const hits = products.filter((p) => String(p.articleNumber ?? '').trim() === broj);
    if (!hits.length) notInCatalog.push(broj);
    else stats.products += hits.length;
  }
  console.log('Excel rows from sheet row', MIN_SHEET_ROW, '→', Object.keys(brojToSizes).length, 'article numbers');
  console.log('Products that would be patched:', stats.products);
  if (notInCatalog.length) console.log('Broj u Excelu, nema u katalogu:', notInCatalog.join(', '));
  if (skipped.length) console.log('Preskočeno (parse):', skipped.length, skipped.slice(0, 5));
  console.log('Dry-run — nije upisano', OUT_JSON, 'niti', OUT_TS);
  process.exit(0);
}

fs.writeFileSync(OUT_JSON, JSON.stringify(brojToSizes, null, 2) + '\n', 'utf8');

for (const p of products) {
  const broj = String(p.articleNumber ?? '').trim();
  if (!broj || !brojToSizes[broj]) continue;
  const sizeIds = brojToSizes[broj];
  const mode = applySizesToProduct(p, sizeIds);
  stats.products++;
  stats.byMode[mode] = (stats.byMode[mode] ?? 0) + 1;
}

for (const broj of Object.keys(brojToSizes)) {
  const hits = products.filter((p) => String(p.articleNumber ?? '').trim() === broj);
  if (!hits.length) notInCatalog.push(broj);
}

console.log('Excel rows from sheet row', MIN_SHEET_ROW, '→', Object.keys(brojToSizes).length, 'article numbers');
console.log('Products patched:', stats.products, stats.byMode);
if (notInCatalog.length) console.log('Broj u Excelu, nema u katalogu:', notInCatalog.join(', '));
if (skipped.length) console.log('Preskočeno (parse):', skipped.length, skipped.slice(0, 5));

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — sync-excel-sizes-from-row60 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
console.log('Written', OUT_JSON, 'and', OUT_TS);
