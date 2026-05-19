/**
 * Even (937): restore size 42 — leon.rs has 36–42.
 * npx tsx scripts/patch-even-937.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEON_ARTICLE_SIZE_OVERRIDES, rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SLUGS = ['even-braon', 'even-siva'];
const SIZES = LEON_ARTICLE_SIZE_OVERRIDES['937'];

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);
let fixed = 0;
for (const slug of SLUGS) {
  const p = products.find((x) => x.slug === slug);
  if (!p) continue;
  Object.assign(p, rebuildProductSizes(p, SIZES));
  fixed++;
}
fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — even-937 sizes ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
if (fs.existsSync(CACHE_PATH)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  for (const slug of SLUGS) if (cache[slug]) cache[slug].sizes = SIZES;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}
console.log('Even 937 sizes →', SIZES.join(','), 'fixed:', fixed);
