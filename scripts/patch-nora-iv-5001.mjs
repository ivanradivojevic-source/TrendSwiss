/**
 * Nora IV (5001): ženska klompa — 4 boje; galerije sa leon.rs; 69 CHF; sizes 36–41.
 * npx tsx scripts/patch-nora-iv-5001.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const SIZES = ['36', '37', '38', '39', '40', '41'];
const ARTICLE = '5001';
const PRICE_CHF = 69;
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

const PAGES = [
  {
    slug: 'nora-iv-sampanj',
    url: 'https://leon.rs/p/nora-iv-sampanj/',
    colorLabel: 'SAMPANJ',
    name: {
      de: 'Nora IV – Champagner',
      fr: 'Nora IV – Champagne',
      en: 'Nora IV – Champagne',
      it: 'Nora IV – Champagne',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/nora-iv-538.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-SAMPANJ-5.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-SAMPANJ-6.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-SAMPANJ-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-SAMPANJ-4.jpg',
    ],
  },
  {
    slug: 'nora-iv-perla',
    url: 'https://leon.rs/p/nora-iv-perla/',
    colorLabel: 'PERLA',
    name: {
      de: 'Nora IV – Perle',
      fr: 'Nora IV – Perle',
      en: 'Nora IV – Pearl',
      it: 'Nora IV – Perla',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-PERLA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-PERLA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-PERLA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-PERLA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-PERLA-4.jpg',
    ],
  },
  {
    slug: 'nora-iv-crna',
    url: 'https://leon.rs/p/nora-iv-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Nora IV – Schwarz',
      fr: 'Nora IV – Noir',
      en: 'Nora IV – Black',
      it: 'Nora IV – Nero',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-CRNA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-CRNA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-CRNA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-CRNA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-CRNA-4.jpg',
    ],
  },
  {
    slug: 'nora-iv-bela',
    url: 'https://leon.rs/p/nora-iv-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Nora IV – Weiß',
      fr: 'Nora IV – Blanc',
      en: 'Nora IV – White',
      it: 'Nora IV – Bianco',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-BELA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-BELA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-BELA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-BELA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-IV-BELA-4.jpg',
    ],
  },
];

const DESCRIPTION = {
  de: 'Damenklompe „Nora IV“ mit weichem, anatomischem Fussbett.',
  fr: 'Sabots femme « Nora IV » avec semelle intérieure anatomique douce.',
  en: 'Women\'s clog "Nora IV" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Nora IV» con plantare anatomico morbido.',
};

/** Galerija sa leon.rs fancybox (samo slike tog proizvoda). */
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

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function patchExploreTags(productIds) {
  const text = fs.readFileSync(TAGS_TS, 'utf8');
  const m = text.match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (!m) throw new Error('Could not parse leonExploreTagsByProductId');
  const map = JSON.parse(m[1]);
  for (const id of productIds) map[id] = EXPLORE_TAGS;
  fs.writeFileSync(
    TAGS_TS,
    `/* AUTO-GENERATED — nora-iv-5001 ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(map, null, 2)};\n`,
    'utf8'
  );
}

const products = loadProducts();
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const touchedIds = [];

for (const page of PAGES) {
  let gallery = page.fallbackGallery ?? [];

  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (res.ok) {
    const scraped = extractFancyboxGallery(await res.text());
    if (scraped.length) gallery = scraped;
  } else if (!gallery.length) {
    throw new Error(`HTTP ${res.status} ${page.url}`);
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — fallback gallery`);
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-nora-iv-5001-women';
  p.name = page.name;
  p.description = DESCRIPTION;
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery;
  Object.assign(p, rebuildProductSizes(p, SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  touchedIds.push(p.id);
  cache[page.slug] = {
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: SIZES,
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    page.slug,
    'CHF',
    PRICE_CHF,
    'images',
    gallery.length,
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

patchExploreTags(touchedIds);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — nora-iv-5001 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Nora IV 5001 done.');
