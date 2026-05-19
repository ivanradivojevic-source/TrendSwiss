/**
 * Portofino I (6010): 4 boje u jednoj grupi — kao leon.rs/p/portofino-bela-bakkar/
 * npx tsx scripts/patch-portofino-6010-group.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = '6010';
const MODEL_GROUP = 'leon-mg-portofino-6010-women';
const PRICE_CHF = 79;
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

const SLUGS = [
  'portofino-i-zlatna',
  'portofino-roze-bakkar',
  'portofino-crna-bakkar',
  'portofino-bela-bakkar',
];

function extractFancyboxGallery(html) {
  const urls = [];
  for (const re of [
    /href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*data-fancybox=["']product-gallery/gi,
    /data-fancybox=["']product-gallery["'][^>]*href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi,
  ]) {
    for (const m of html.matchAll(re)) {
      if (m[1] && !urls.includes(m[1])) urls.push(m[1]);
    }
  }
  return urls.filter((u) => !/favicon|logo\.png/i.test(u));
}

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);

let tagsMap = {};
if (fs.existsSync(TAGS_TS)) {
  const m = fs.readFileSync(TAGS_TS, 'utf8').match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (m) tagsMap = JSON.parse(m[1]);
}

for (const slug of SLUGS) {
  const p = products.find((x) => x.slug === slug);
  if (!p) {
    console.warn('missing', slug);
    continue;
  }
  p.modelGroupId = MODEL_GROUP;
  p.articleNumber = ARTICLE;
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  const url = `https://leon.rs/p/${slug}/`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (res.ok) {
    const gallery = extractFancyboxGallery(await res.text());
    if (gallery.length > 1) {
      p.image = gallery[0];
      p.images = gallery;
    }
  }

  tagsMap[p.id] = EXPLORE_TAGS;
  console.log(slug, 'images', p.images?.length ?? 1, 'CHF', PRICE_CHF);
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — portofino-6010-group ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — portofino-6010 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);
console.log('Portofino 6010 grouped:', SLUGS.length);
