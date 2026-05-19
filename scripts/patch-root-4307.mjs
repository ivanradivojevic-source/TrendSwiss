/**
 * Root (4307): restore size 42 — leon.rs has 36–42 for this sandal line.
 * npx tsx scripts/patch-root-4307.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEON_ARTICLE_SIZE_OVERRIDES, rebuildProductSizes } from './leon-size-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const ROOT_SLUGS = ['root-braon', 'root-bez', 'root-crna'];
const SIZES = LEON_ARTICLE_SIZE_OVERRIDES['4307'];

function main() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const products = JSON.parse(text.match(/export const leonProducts = (\[[\s\S]*\]);/)[1]);
  let fixed = 0;
  for (const slug of ROOT_SLUGS) {
    const p = products.find((x) => x.slug === slug);
    if (!p) {
      console.warn('Missing', slug);
      continue;
    }
    Object.assign(p, rebuildProductSizes(p, SIZES));
    fixed++;
  }
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — root-4307 sizes ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
  if (fs.existsSync(CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    for (const slug of ROOT_SLUGS) {
      if (cache[slug]) cache[slug].sizes = SIZES;
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }
  console.log('Root 4307 sizes →', SIZES.join(','), 'fixed:', fixed);
}

main();
