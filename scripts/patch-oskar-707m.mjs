/**
 * Oskar (707M): men's clog — teget, crna, braon; sizes 41–48; galleries from leon.rs.
 * npx tsx scripts/patch-oskar-707m.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['41', '42', '43', '44', '45', '46', '47', '48'];
const ARTICLE = '707M';
const PRICE_CHF = 69;

const PAGES = [
  {
    slug: 'oskar-teget',
    url: 'https://leon.rs/p/oskar-teget/',
    colorLabel: 'TEGET',
    name: {
      de: 'Oskar – Anthrazit',
      fr: 'Oskar – Anthracite',
      en: 'Oskar – Charcoal',
      it: 'Oskar – Antracite',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/707M-Teget(\d+)\.(?:jpg|jpeg|png|webp)/gi,
    sortGallery: (a, b) => Number(a[0]) - Number(b[0]),
  },
  {
    slug: 'oskar-crna',
    url: 'https://leon.rs/p/oskar-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Oskar – Schwarz',
      fr: 'Oskar – Noir',
      en: 'Oskar – Black',
      it: 'Oskar – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Oskar-CRNA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'oskar-braon',
    url: 'https://leon.rs/p/oskar-braon/',
    colorLabel: 'BRAON',
    name: {
      de: 'Oskar – Braun',
      fr: 'Oskar – Marron',
      en: 'Oskar – Brown',
      it: 'Oskar – Marrone',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Oskar-BRAON(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
];

function extractGallery(html, page) {
  const byIndex = new Map();
  for (const m of html.matchAll(page.galleryRe)) {
    const idx = m[1] ? Number(m[1]) : 0;
    if (!byIndex.has(idx)) byIndex.set(idx, m[0]);
  }
  const entries = [...byIndex.entries()];
  const sort = page.sortGallery ?? ((a, b) => a[0] - b[0]);
  return entries.sort(sort).map(([, url]) => url);
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
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  const gallery = extractGallery(html, page);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizeList = [
    ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 41 && Number(s) <= 48)),
  ].sort((a, b) => Number(a) - Number(b));

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'men';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-oskar-707m-men';
  p.name = page.name;
  p.description = {
    de: 'Herrenmodell „Oskar“ mit bequemem, anatomischem Fussbett.',
    fr: 'Modèle homme « Oskar » avec semelle intérieure anatomique confortable.',
    en: 'Men\'s model "Oskar" with a comfortable anatomical footbed.',
    it: 'Modello da uomo «Oskar» con plantare anatomico confortevole.',
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
  `/* AUTO-GENERATED — oskar-707m ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Oskar 707M done.');
