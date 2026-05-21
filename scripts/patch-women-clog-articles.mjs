/**
 * Women's clogs by article + detach Emili III from V260.
 * npx tsx scripts/patch-women-clog-articles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const SLUGS_JSON = path.join(ROOT, 'data', 'excel-shop-slugs.json');

const CLOG_ARTICLES = new Set([
  '300',
  '302',
  '6003',
  '902',
  '900',
  'V260',
  'V2090',
  '4251',
  '4250',
  '1024',
  '2019',
  '912',
  'V202',
  'V200',
  '7002',
]);
const EXPLORE_TAGS = ['klompe'];
const EMILI_I_SLUGS = new Set(['emili-i-perla', 'emili-i-crna', 'emili-i-bela']);
const EMILI_III_SLUGS = new Set(['emili-iii-teget', 'emili-iii-roze', 'emili-iii-bela']);

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
let clogTagged = 0;
let emiliFixed = 0;

for (const p of products) {
  const slug = p.slug ?? '';

  if (EMILI_III_SLUGS.has(slug)) {
    delete p.articleNumber;
    for (const v of p.variants ?? []) v.priceCHF = null;
    delete tagsMap[p.id];
    emiliFixed++;
    continue;
  }

  if (EMILI_I_SLUGS.has(slug)) {
    p.articleNumber = 'V260';
    p.category = 'women';
    tagsMap[p.id] = EXPLORE_TAGS;
    clogTagged++;
    continue;
  }

  if (p.category === 'women' && CLOG_ARTICLES.has(p.articleNumber)) {
    tagsMap[p.id] = EXPLORE_TAGS;
    clogTagged++;
  }
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — women-clog-articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — women-clog-articles ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

if (fs.existsSync(SLUGS_JSON)) {
  const slugs = JSON.parse(fs.readFileSync(SLUGS_JSON, 'utf8'));
  const next = slugs.filter((s) => !EMILI_III_SLUGS.has(s));
  fs.writeFileSync(SLUGS_JSON, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log('excel-shop-slugs: removed Emili III', slugs.length - next.length);
}

console.log('Clog tags:', clogTagged, 'Emili III detached from V260:', emiliFixed);
