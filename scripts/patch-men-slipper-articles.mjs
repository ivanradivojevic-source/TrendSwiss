/**
 * Men's slippers: 4703M (Kratos), 4704M (Mateo), 4705M (Ridge) → papuce.
 * npx tsx scripts/patch-men-slipper-articles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const SLIPPER_ARTICLES = new Set(['4703M', '4704M', '4705M']);
const EXPLORE_TAGS = ['papuce'];

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function loadTags() {
  const text = fs.readFileSync(TAGS_TS, 'utf8');
  const m = text.match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (!m) throw new Error('Could not parse leonExploreTagsByProductId');
  return JSON.parse(m[1]);
}

const products = loadProducts();
const tagsMap = loadTags();
let n = 0;

for (const p of products) {
  if (p.category !== 'men' || !SLIPPER_ARTICLES.has(p.articleNumber)) continue;
  tagsMap[p.id] = EXPLORE_TAGS;
  n++;
}

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — men-slipper-articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

console.log(`Men's slipper tags: ${n} (${[...SLIPPER_ARTICLES].join(', ')})`);
