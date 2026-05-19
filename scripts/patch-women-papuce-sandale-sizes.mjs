/**
 * Remove size 42 from all women's papuce + sandale (per leon.rs: 36–41).
 * npx tsx scripts/patch-women-papuce-sandale-sizes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEON_ARTICLE_SIZE_OVERRIDES,
  LEON_WOMEN_PAPUCE_SANDALE_SIZES,
  buildPapuceSandaleSlugSet,
  rebuildProductSizes,
} from './leon-size-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function main() {
  const slugSet = buildPapuceSandaleSlugSet(ROOT);
  console.log('Women papuce+sandale slugs from raw:', slugSet.size);

  const products = loadLeonProducts();
  let fixed = 0;
  let had42 = 0;
  const fixedSlugs = [];

  for (const p of products) {
    if (p.category !== 'women' || !slugSet.has(p.slug)) continue;
    if (p.articleNumber && LEON_ARTICLE_SIZE_OVERRIDES[p.articleNumber]) continue;
    if (p.variants?.some((v) => v.size === '42')) had42++;
    Object.assign(p, rebuildProductSizes(p, LEON_WOMEN_PAPUCE_SANDALE_SIZES));
    fixed++;
    fixedSlugs.push(p.slug);
  }

  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — women papuce/sandale sizes ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );

  if (fs.existsSync(CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    for (const slug of fixedSlugs) {
      if (cache[slug]) cache[slug].sizes = LEON_WOMEN_PAPUCE_SANDALE_SIZES;
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }

  console.log('Catalog rows patched:', fixed);
  console.log('Had size 42 before:', had42);
  console.log('Sizes now:', LEON_WOMEN_PAPUCE_SANDALE_SIZES.join(','));
}

main();
