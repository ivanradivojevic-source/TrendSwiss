/**
 * Emili I (V260): perla, crna, bela — colour-specific galleries from leon.rs.
 * npx tsx scripts/patch-emili-i-v260.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = 'V260';
const PRICE_CHF = 39;
const EXPLORE_TAGS = ['klompe'];
const EMILI_I_SLUGS = new Set(['emili-i-perla', 'emili-i-crna', 'emili-i-bela']);

const PAGES = [
  {
    slug: 'emili-i-perla',
    url: 'https://leon.rs/p/emili-i-perla/',
    colorLabel: 'PERLA',
    name: {
      de: 'Emili I – Perle',
      fr: 'Emili I – Perle',
      en: 'Emili I – Pearl',
      it: 'Emili I – Perla',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Emili-I-PERLA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-PERLA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-PERLA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-PERLA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-PERLA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-PERLA-4.jpg',
    ],
  },
  {
    slug: 'emili-i-crna',
    url: 'https://leon.rs/p/emili-i-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Emili I – Schwarz',
      fr: 'Emili I – Noir',
      en: 'Emili I – Black',
      it: 'Emili I – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Emili-I-CRNA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-CRNA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-CRNA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-CRNA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-CRNA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-CRNA-4.jpg',
    ],
  },
  {
    slug: 'emili-i-bela',
    url: 'https://leon.rs/p/emili-i-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Emili I – Weiß',
      fr: 'Emili I – Blanc',
      en: 'Emili I – White',
      it: 'Emili I – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Emili-I-BELA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-BELA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-BELA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-BELA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-BELA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Emili-I-BELA-4.jpg',
    ],
  },
];

function extractGallery(html, re) {
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

const products = loadProducts();
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

for (const page of PAGES) {
  let gallery = page.fallbackGallery ?? [];

  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (res.ok) {
    const html = await res.text();
    const scraped = extractGallery(html, page.galleryRe);
    if (scraped.length) gallery = scraped;
  } else if (!gallery.length) {
    throw new Error(`HTTP ${res.status} ${page.url} and no fallback gallery`);
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — using fallback gallery`);
  }

  if (!EMILI_I_SLUGS.has(page.slug)) continue;

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  try {
    await fetchLeonPageInfo(page.url);
  } catch {
    /* optional */
  }

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-emili-i-v260-women';
  p.name = page.name;
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  cache[page.slug] = {
    ...(cache[page.slug] ?? {}),
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
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

let tagsMap = {};
if (fs.existsSync(TAGS_TS)) {
  const m = fs.readFileSync(TAGS_TS, 'utf8').match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (m) tagsMap = JSON.parse(m[1]);
}
for (const slug of EMILI_I_SLUGS) {
  const p = products.find((x) => x.slug === slug);
  if (p?.id) tagsMap[p.id] = EXPLORE_TAGS;
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — emili-i-v260 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
if (fs.existsSync(TAGS_TS)) {
  fs.writeFileSync(
    TAGS_TS,
    `/* AUTO-GENERATED — emili-i-v260 ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
    'utf8'
  );
}
console.log('Emili I V260 done (Emili III excluded).');
