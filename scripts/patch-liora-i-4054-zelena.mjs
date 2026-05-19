/**
 * Liora I (4054): zelena varijanta — grupa sa bela/crna, galerija sa leon.rs, 53 CHF.
 * npx tsx scripts/patch-liora-i-4054-zelena.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = '4054';
const PRICE_CHF = 53;
const MODEL_GROUP = 'leon-mg-liora-i-women';
const EXPLORE_TAGS = ['papuce', 'zenske-papuce'];
const SIZES = sizesForArticle(ARTICLE) ?? ['35', '36', '37', '38', '39', '40', '41', '42'];

const PAGE = {
  slug: 'liora-zelena',
  url: 'https://leon.rs/p/liora-zelena/',
  colorLabel: 'ZELENA',
  name: {
    de: 'Liora I – Grün',
    fr: 'Liora I – Vert',
    en: 'Liora I – Green',
    it: 'Liora I – Verde',
  },
};

const DESCRIPTION = {
  de: 'Damenpapuča „Liora I“ mit weichem, anatomischem Fussbett.',
  fr: 'Mules femme « Liora I » avec semelle intérieure anatomique douce.',
  en: 'Women\'s mule "Liora I" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Liora I» con plantare anatomico morbido.',
};

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

function filterLioraZelena(urls) {
  return urls.filter((u) => /Liora-ZELENA|4054/i.test(u));
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function buildProduct(gallery) {
  const colors = [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const base = {
    id: `leon-${PAGE.slug}`,
    slug: PAGE.slug,
    category: 'women',
    brand: 'leon',
    modelGroupId: MODEL_GROUP,
    articleNumber: ARTICLE,
    name: PAGE.name,
    description: DESCRIPTION,
    colorLabel: PAGE.colorLabel,
    image: gallery[0],
    images: gallery,
    colors,
  };
  const sized = rebuildProductSizes(base, SIZES);
  for (const v of sized.variants ?? []) v.priceCHF = PRICE_CHF;
  return { ...base, ...sized };
}

const products = loadProducts();
const res = await fetch(PAGE.url, {
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const html = await res.text();
let gallery = filterLioraZelena(extractFancyboxGallery(html));
if (gallery.length <= 1) {
  gallery = filterLioraZelena(
    [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
      (m) => m[0]
    )
  );
}
if (gallery.length <= 1) {
  gallery = [
    'https://cdn.leon.rs/wp-content/uploads/2025/09/Liora-ZELENA.jpg',
    'https://cdn.leon.rs/wp-content/uploads/2025/09/Liora-ZELENA-1.jpg',
    'https://cdn.leon.rs/wp-content/uploads/2025/09/Liora-ZELENA-2.jpg',
    'https://cdn.leon.rs/wp-content/uploads/2025/09/Liora-ZELENA-3.jpg',
  ];
}

const built = buildProduct(gallery);
const idx = products.findIndex((x) => x.slug === PAGE.slug);
if (idx < 0) products.push(built);
else products[idx] = built;

// Ensure all Liora I 4054 share same group
for (const slug of ['liora-i-bela', 'liora-i-crna', PAGE.slug]) {
  const p = products.find((x) => x.slug === slug);
  if (!p) continue;
  p.modelGroupId = MODEL_GROUP;
  p.articleNumber = ARTICLE;
  for (const v of p.variants ?? []) {
    if (!v.priceCHF || v.priceCHF <= 0) v.priceCHF = PRICE_CHF;
  }
}

const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
cache[PAGE.slug] = {
  url: PAGE.url,
  sifra: ARTICLE,
  title: PAGE.name.en,
  colorLabel: PAGE.colorLabel,
  sizes: SIZES,
  fetchedAt: new Date().toISOString(),
};

let tagsMap = {};
if (fs.existsSync(TAGS_TS)) {
  const m = fs.readFileSync(TAGS_TS, 'utf8').match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (m) tagsMap = JSON.parse(m[1]);
}
for (const slug of ['liora-i-bela', 'liora-i-crna', PAGE.slug]) {
  const p = products.find((x) => x.slug === slug);
  if (p) tagsMap[p.id] = EXPLORE_TAGS;
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — liora-i-4054-zelena ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — liora-i-4054 */\nexport const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);

console.log(PAGE.slug, 'images', gallery.length, 'CHF', PRICE_CHF, 'group', MODEL_GROUP);
