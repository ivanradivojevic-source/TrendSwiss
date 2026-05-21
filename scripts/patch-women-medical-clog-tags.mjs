/**
 * Tags for women's medical clogs (950, 970, 3500, 5000, 5001): klompe + medicinske-klompe.
 * npx tsx scripts/patch-women-medical-clog-tags.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLES = new Set(['950', '970', '3500', '5000', '5001']);
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

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
  if (p.category !== 'women' || !ARTICLES.has(p.articleNumber)) continue;
  const id = p.id ?? `leon-${p.slug}`;
  tagsMap[id] = EXPLORE_TAGS;
  n++;
}

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — women medical clog articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

console.log(`Tagged ${n} products (${[...ARTICLES].join(', ')})`);
