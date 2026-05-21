/**
 * Olaf (4800): dečije klompe — samo klompe.
 * npx tsx scripts/patch-children-clog-4800.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const ARTICLE = '4800';
const TAGS = ['klompe'];

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);
const tagsMap = JSON.parse(
  fs.readFileSync(TAGS_TS, 'utf8').match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/)[1]
);

let n = 0;
for (const p of products) {
  if (p.category !== 'children' || p.articleNumber !== ARTICLE) continue;
  tagsMap[p.id] = TAGS;
  n++;
}

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — children-clog-4800 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);
console.log(`Children clog 4800: ${n} products`);
