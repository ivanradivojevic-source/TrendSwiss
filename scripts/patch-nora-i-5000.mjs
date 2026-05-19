/**
 * Nora I (5000): ženska klompa — crna, braon; sizes 36–41; galleries from leon.rs.
 * npx tsx scripts/patch-nora-i-5000.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const SIZES = ['36', '37', '38', '39', '40', '41'];
const ARTICLE = '5000';
const PRICE_CHF = 79;
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

const PAGES = [
  {
    slug: 'nora-i-crna',
    url: 'https://leon.rs/p/nora-i-crna/',
    colorLabel: 'CRNA',
    colorStem: 'CRNA',
    name: {
      de: 'Nora I – Schwarz',
      fr: 'Nora I – Noir',
      en: 'Nora I – Black',
      it: 'Nora I – Nero',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-CRNA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-CRNA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-CRNA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-CRNA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-CRNA-5.jpg',
    ],
  },
  {
    slug: 'nora-i-braon',
    url: 'https://leon.rs/p/nora-i-braon/',
    colorLabel: 'BRAON',
    colorStem: 'BRAON',
    name: {
      de: 'Nora I – Braun',
      fr: 'Nora I – Marron',
      en: 'Nora I – Brown',
      it: 'Nora I – Marrone',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-BRAON.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-BRAON-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-BRAON-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-BRAON-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Nora-I-BRAON-4.jpg',
    ],
  },
];

const DESCRIPTION = {
  de: 'Damenklompe „Nora I“ mit weichem, anatomischem Fussbett.',
  fr: 'Sabots femme « Nora I » avec semelle intérieure anatomique douce.',
  en: 'Women\'s clog "Nora I" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Nora I» con plantare anatomico morbido.',
};

function extractGallery(html, colorStem) {
  const re = new RegExp(
    `https://cdn\\.leon\\.rs/wp-content/uploads/[^"'\\\\s>]+/Nora-I-${colorStem}(?:-(\\d+))?\\.(?:jpg|jpeg|png|webp)`,
    'gi'
  );
  const byIndex = new Map();
  for (const m of html.matchAll(re)) {
    const idx = m[1] ? Number(m[1]) : 0;
    if (!byIndex.has(idx)) byIndex.set(idx, m[0]);
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url);
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
    `/* AUTO-GENERATED — nora-i-5000 ${new Date().toISOString().slice(0, 10)} */\n` +
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
    const html = await res.text();
    const scraped = extractGallery(html, page.colorStem);
    if (scraped.length) gallery = scraped;
    try {
      await fetchLeonPageInfo(page.url);
    } catch {
      /* optional */
    }
  } else if (!gallery.length) {
    throw new Error(`HTTP ${res.status} ${page.url}`);
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-nora-i-5000-women';
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
    'images',
    gallery.length,
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

patchExploreTags(touchedIds);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — nora-i-5000 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Nora I 5000 done.');
