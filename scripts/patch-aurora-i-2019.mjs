/**
 * Aurora I (2019): ženska klompa — sve boje; veličine 36–41 (bez 42).
 * Čuva istorijske SKU-ove (Alpen Komfort brojevi).
 * npx tsx scripts/patch-aurora-i-2019.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['36', '37', '38', '39', '40', '41'];
const ARTICLE = '2019';

/** Isti prefiks kao u starom katalogu (švajcarski Alpen Komfort brojevi). */
const SKU_PREFIX = {
  'aurora-i-crna': 'LEON-ALPEN-KOMFORT-211',
  'aurora-i-braon': 'LEON-ALPEN-KOMFORT-210',
  'aurora-i-bela': 'LEON-ALPEN-KOMFORT-212',
};

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const products = loadProducts();
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

let n = 0;
for (const p of products) {
  if (p.articleNumber !== ARTICLE) continue;
  const prefix = SKU_PREFIX[p.slug];
  if (!prefix) throw new Error(`No SKU prefix for slug ${p.slug}`);

  p.sizes = (p.sizes ?? []).filter((s) => SIZES.includes(String(s.id)));
  p.variants = (p.variants ?? [])
    .filter((v) => SIZES.includes(String(v.size)))
    .map((v) => ({
      ...v,
      sku: `${prefix}-${v.size}-${v.color}`,
    }));

  n++;
  if (cache[p.slug]) {
    cache[p.slug].sizes = SIZES;
    cache[p.slug].fetchedAt = new Date().toISOString();
  }
  console.log(p.slug, '→', SIZES.join(','), 'sku', prefix);
}

if (!n) throw new Error(`No products with articleNumber ${ARTICLE}`);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — aurora-i-2019 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Aurora I', ARTICLE, 'done —', n, 'rows.');
