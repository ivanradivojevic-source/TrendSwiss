/**
 * Kratos (4703M): men's sizes 42–49.
 * npx tsx scripts/patch-kratos-4703m.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['42', '43', '44', '45', '46', '47', '48', '49'];
const SLUGS = ['kratos-siva-velur', 'kratos-crna', 'kratos-braon-velur'];

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const products = loadProducts();
let fixed = 0;

for (const slug of SLUGS) {
  const p = products.find((x) => x.slug === slug);
  if (!p) {
    console.warn('Missing', slug);
    continue;
  }
  p.articleNumber = '4703M';
  p.category = 'men';
  p.modelGroupId = 'leon-mg-kratos-4703m-men';
  Object.assign(p, rebuildProductSizes(p, SIZES));
  fixed++;
  console.log(slug, '→', SIZES.join(','));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — kratos-4703m sizes ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

if (fs.existsSync(CACHE_PATH)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  for (const slug of SLUGS) {
    if (cache[slug]) cache[slug].sizes = SIZES;
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

console.log('Kratos 4703M fixed:', fixed);
