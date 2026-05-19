/**
 * Rubicon (3500): ženska klompa — 4 boje; sizes 36–41; colour-specific galleries from leon.rs.
 * npx tsx scripts/patch-rubicon-3500.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['36', '37', '38', '39', '40', '41'];
const ARTICLE = '3500';
const PRICE_CHF = 49;

const PAGES = [
  {
    slug: 'rubicon-teget-bakkar',
    url: 'https://leon.rs/p/rubicon-teget-bakkar/',
    colorLabel: 'TEGET BAKKAR',
    name: {
      de: 'Rubicon – Anthrazit Lack',
      fr: 'Rubicon – Anthracite verni',
      en: 'Rubicon – Charcoal patent',
      it: 'Rubicon – Antracite verniciato',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/RUBICON-TEGET-BAKKAR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'rubicon-roze-bakkar',
    url: 'https://leon.rs/p/rubicon-roze-bakkar/',
    colorLabel: 'ROZE BAKKAR',
    name: {
      de: 'Rubicon – Rosa Lack',
      fr: 'Rubicon – Rose verni',
      en: 'Rubicon – Pink patent',
      it: 'Rubicon – Rosa verniciato',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/RUBICON-ROZE-BAKKAR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/RUBICON-ROZE-BAKKAR.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/RUBICON-ROZE-BAKKAR-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/RUBICON-ROZE-BAKKAR-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/RUBICON-ROZE-BAKKAR-3.jpg',
    ],
  },
  {
    slug: 'rubicon-crna-bakkar',
    url: 'https://leon.rs/p/rubicon-crna-bakkar/',
    colorLabel: 'CRNA BAKKAR',
    name: {
      de: 'Rubicon – Schwarz Lack',
      fr: 'Rubicon – Noir verni',
      en: 'Rubicon – Black patent',
      it: 'Rubicon – Nero verniciato',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/RUBICON-CRNA-BAKKAR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'rubicon-bela-bakkar',
    url: 'https://leon.rs/p/rubicon-bela-bakkar/',
    colorLabel: 'BELA BAKKAR',
    name: {
      de: 'Rubicon – Weiß Lack',
      fr: 'Rubicon – Blanc verni',
      en: 'Rubicon – White patent',
      it: 'Rubicon – Bianco verniciato',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/RUBICON-BELA-BAKKAR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
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
  let sizeList = [...SIZES];

  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (res.ok) {
    const html = await res.text();
    const scraped = extractGallery(html, page.galleryRe);
    if (scraped.length) gallery = scraped;
    try {
      const info = await fetchLeonPageInfo(page.url);
      sizeList = [
        ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 36 && Number(s) <= 41)),
      ].sort((a, b) => Number(a) - Number(b));
    } catch {
      /* keep defaults */
    }
  } else if (!gallery.length) {
    throw new Error(`HTTP ${res.status} ${page.url} and no fallback gallery`);
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — using fallback gallery`);
  }

  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-rubicon-3500-women';
  p.name = page.name;
  p.description = {
    de: 'Damenmodell „Rubicon“ mit weichem, anatomischem Fussbett.',
    fr: 'Modèle femme « Rubicon » avec semelle intérieure anatomique douce.',
    en: 'Women\'s model "Rubicon" with a soft anatomical footbed.',
    it: 'Modello da donna «Rubicon» con plantare anatomico morbido.',
  };
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildProductSizes(p, sizeList.length ? sizeList : SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  cache[page.slug] = {
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: sizeList.length ? sizeList : SIZES,
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    page.slug,
    'sizes',
    (sizeList.length ? sizeList : SIZES).join(','),
    'images',
    gallery.length,
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — rubicon-3500 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Rubicon 3500 done.');
