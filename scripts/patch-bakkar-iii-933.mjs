/**
 * Bakkar III (Excel 933 „Bakkar“): 2 boje sa leon.rs; 49 CHF; veličine 35–42.
 * npx tsx scripts/patch-bakkar-iii-933.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = '933';
const PRICE_CHF = 49;
const SIZES = sizesForArticle(ARTICLE) ?? ['35', '36', '37', '38', '39', '40', '41', '42'];
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

const PAGES = [
  {
    slug: 'bakkar-iii-roze-bakkar',
    url: 'https://leon.rs/p/bakkar-iii-roze-bakkar/',
    colorLabel: 'ROZE BAKKAR',
    name: {
      de: 'Bakkar III – Rosé Bakkar',
      fr: 'Bakkar III – Rose Bakkar',
      en: 'Bakkar III – Pink Bakkar',
      it: 'Bakkar III – Rosa Bakkar',
    },
  },
  {
    slug: 'bakkar-iii-bela-bakkar',
    url: 'https://leon.rs/p/bakkar-iii-bela-bakkar/',
    colorLabel: 'BELA BAKKAR',
    name: {
      de: 'Bakkar III – Weiß Bakkar',
      fr: 'Bakkar III – Blanc Bakkar',
      en: 'Bakkar III – White Bakkar',
      it: 'Bakkar III – Bianco Bakkar',
    },
  },
];

const DESCRIPTION = {
  de: 'Damenklompe „Bakkar III“ mit weichem, anatomischem Fussbett.',
  fr: 'Sabots femme « Bakkar III » avec semelle intérieure anatomique douce.',
  en: 'Women\'s clog "Bakkar III" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Bakkar III» con plantare anatomico morbido.',
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
  return urls;
}

function filterBakkarIii(urls) {
  return urls.filter((u) => /BAKKAR-III|Bakkar-III|bakkar-iii/i.test(u) && !/favicon|logo\.png/i.test(u));
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function makeColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
}

function buildNewProduct(page, gallery) {
  const colors = makeColors();
  const skuBase = page.slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const base = {
    id: `leon-${page.slug}`,
    slug: page.slug,
    category: 'women',
    brand: 'leon',
    modelGroupId: 'leon-mg-bakkar-iii-933-women',
    articleNumber: ARTICLE,
    name: page.name,
    description: DESCRIPTION,
    colorLabel: page.colorLabel,
    image: gallery[0],
    images: gallery,
    colors,
  };
  const sized = rebuildProductSizes(base, SIZES);
  for (const v of sized.variants ?? []) v.priceCHF = PRICE_CHF;
  return { ...base, ...sized };
}

function patchExploreTags(productIds) {
  const text = fs.readFileSync(TAGS_TS, 'utf8');
  const m = text.match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (!m) throw new Error('Could not parse leonExploreTagsByProductId');
  const map = JSON.parse(m[1]);
  for (const id of productIds) map[id] = EXPLORE_TAGS;
  fs.writeFileSync(
    TAGS_TS,
    `/* AUTO-GENERATED — bakkar-iii-933 ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(map, null, 2)};\n`,
    'utf8'
  );
}

let products = loadProducts().filter((p) => p?.id && p?.slug);
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const touchedIds = [];
const modelGroupId = 'leon-mg-bakkar-iii-933-women';

for (const page of PAGES) {
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  let gallery = filterBakkarIii(extractFancyboxGallery(html));
  if (gallery.length <= 1) {
    gallery = filterBakkarIii(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0]
      )
    );
  }
  if (gallery.length <= 1) throw new Error(`No gallery for ${page.slug}`);

  const built = buildNewProduct(page, gallery);
  const idx = products.findIndex((x) => x.slug === page.slug);
  if (idx < 0) {
    products.push(built);
    console.log('ADD', page.slug);
  } else {
    products[idx] = built;
    console.log('PATCH', page.slug);
  }
  const p = built;

  cache[page.slug] = {
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: p.sizes?.map((s) => s.id),
    fetchedAt: new Date().toISOString(),
  };
  touchedIds.push(p.id);

  console.log(
    page.slug,
    'CHF',
    PRICE_CHF,
    'sizes',
    p.sizes?.map((s) => s.id).join(','),
    'images',
    gallery.length
  );
}

patchExploreTags(touchedIds);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — bakkar-iii-933 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Bakkar III 933 done.', touchedIds.length, 'products, group', modelGroupId);
