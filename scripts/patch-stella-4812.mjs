/**
 * Stella II (4812): children's sizes 22–34 per leon.rs.
 * npx tsx scripts/patch-stella-4812.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const CHILDREN_SIZES_22_34 = [
  '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
];

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);

let fixed = 0;
for (const p of products) {
  if (p.articleNumber !== '4812') continue;
  p.category = 'children';
  Object.assign(p, rebuildProductSizes(p, CHILDREN_SIZES_22_34));
  fixed++;
  console.log(' ', p.slug, '→', CHILDREN_SIZES_22_34.join(','));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — stella-4812 sizes ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

if (fs.existsSync(CACHE_PATH)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  for (const slug of ['stella-ii-zlatna', 'stella-ii-roze']) {
    if (cache[slug]) cache[slug].sizes = CHILDREN_SIZES_22_34;
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

console.log('Stella 4812 fixed:', fixed);
