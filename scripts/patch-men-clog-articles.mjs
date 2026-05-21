/**
 * Men's clogs by article: 300M, 700M, V200M, V202M, V230M, 707M (V707M alias).
 * npx tsx scripts/patch-men-clog-articles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const CLOG_ARTICLES = new Set(['300M', '700M', 'V200M', 'V202M', 'V230M', '707M', 'V707M', '4701M']);
const MEDICAL_CLOG_ARTICLES = new Set(['PU100M']);
const MEDICAL_TAGS = ['klompe', 'medicinske-klompe'];
const EXPLORE_TAGS = ['klompe'];

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
  if (p.category !== 'men') continue;
  if (p.articleNumber === 'V707M') p.articleNumber = '707M';
  if (MEDICAL_CLOG_ARTICLES.has(p.articleNumber)) {
    tagsMap[p.id] = MEDICAL_TAGS;
    n++;
    continue;
  }
  if (!CLOG_ARTICLES.has(p.articleNumber)) continue;
  tagsMap[p.id] = EXPLORE_TAGS;
  n++;
}

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — men-clog-articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

console.log(`Men's clog tags: ${n} products (${[...CLOG_ARTICLES].filter((a) => a !== 'V707M').join(', ')})`);
