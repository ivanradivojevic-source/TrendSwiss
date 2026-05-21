/**
 * Women's sandals by article → sandale.
 * npx tsx scripts/patch-women-sandal-articles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const SANDAL_ARTICLES = new Set([
  '967',
  '1120',
  '963',
  '965',
  '924',
  '1041',
  '1020',
  '935',
  '966',
  '2024',
  '1132',
  '1131',
]);
const EXPLORE_TAGS = ['sandale'];

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
  if (p.category !== 'women' || !SANDAL_ARTICLES.has(p.articleNumber)) continue;
  tagsMap[p.id] = EXPLORE_TAGS;
  n++;
}

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — women-sandal-articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

console.log(`Women's sandal tags: ${n} (${[...SANDAL_ARTICLES].join(', ')})`);
