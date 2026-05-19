/**
 * Ridge (4705M): sizes 42–49 per leon.rs; galleries per colour variant.
 * npx tsx scripts/patch-ridge-4705m.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

export const RIDGE_4705M_SIZES = ['42', '43', '44', '45', '46', '47', '48', '49'];

const RIDGE_PAGES = [
  {
    slug: 'ridge-siva',
    url: 'https://leon.rs/p/ridge-siva/',
    colorLabel: 'Siva',
    name: { de: 'Ridge – Siva', fr: 'Ridge – Siva', en: 'Ridge – Grey', it: 'Ridge – Grigio' },
    galleryRe: /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/4705M-Siva-velur(\d+)\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'ridge-tamno-siva',
    url: 'https://leon.rs/p/ridge-tamno-siva/',
    colorLabel: 'Dark Grey',
    name: {
      de: 'Ridge – Dunkelgrau',
      fr: 'Ridge – Gris foncé',
      en: 'Ridge – Dark Grey',
      it: 'Ridge – Grigio scuro',
    },
    galleryRe: /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/4705M-Siva(\d)\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'ridge-braon',
    url: 'https://leon.rs/p/ridge-braon/',
    colorLabel: 'Braon',
    name: { de: 'Ridge – Braon', fr: 'Ridge – Braon', en: 'Ridge – Brown', it: 'Ridge – Marrone' },
    galleryRe: /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/4705M-Braon(\d+)\.(?:jpg|jpeg|png|webp)/gi,
  },
];

function extractGallery(html, re) {
  const byIndex = new Map();
  for (const m of html.matchAll(re)) {
    const idx = Number(m[1]);
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

for (const page of RIDGE_PAGES) {
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  const gallery = extractGallery(html, page.galleryRe);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizes = [...new Set([...RIDGE_4705M_SIZES, ...(info.sizes ?? [])])]
    .filter((s) => Number(s) >= 42 && Number(s) <= 49)
    .sort((a, b) => Number(a) - Number(b));
  const sizeList = sizes.length ? sizes : RIDGE_4705M_SIZES;

  const p = products.find((x) => x.slug === page.slug);
  if (!p) {
    console.warn('Missing', page.slug);
    continue;
  }

  p.category = 'men';
  p.articleNumber = '4705M';
  p.modelGroupId = 'leon-mg-4705m-men';
  p.colorLabel = page.colorLabel;
  p.name = page.name;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildProductSizes(p, sizeList));
  for (const v of p.variants ?? []) v.priceCHF = 89;

  cache[page.slug] = {
    url: page.url,
    sifra: '4705M',
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: sizeList,
    fetchedAt: new Date().toISOString(),
  };

  console.log(page.slug, 'sizes', sizeList.join(','), '→', gallery.map((u) => u.split('/').pop()).join(', '));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — ridge-4705m ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Ridge 4705M updated.');
