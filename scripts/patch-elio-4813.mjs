/**
 * Elio (4813) dečije sandale — galerije samo odgovarajuće boje sa leon.rs.
 * npx tsx scripts/patch-elio-4813.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const CHILDREN_SIZES = [
  '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
];
const PRICE_CHF = 49;
const ARTICLE = '4813';

const PAGES = [
  {
    slug: 'elio-zlatna',
    url: 'https://leon.rs/p/elio-zlatna/',
    colorLabel: 'Gold',
    colorRe: /4813-Zlato/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zlato1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zlato2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zlato3.jpg',
    ],
  },
  {
    slug: 'elio-teget',
    url: 'https://leon.rs/p/elio-teget/',
    colorLabel: 'Charcoal',
    colorRe: /4813-Teget/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Teget-bakkar1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Teget-bakkar2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Teget-bakkar3.jpg',
    ],
  },
  {
    slug: 'elio-zelena',
    url: 'https://leon.rs/p/elio-zelena/',
    colorLabel: 'Green',
    colorRe: /4813-Zelena/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zelena-bakkar.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zelena-bakkar2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Zelena-bakkar3.jpg',
    ],
  },
  {
    slug: 'elio-siva',
    url: 'https://leon.rs/p/elio-siva/',
    colorLabel: 'Grey',
    colorRe: /4813-Siva/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Siva-bakkar1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Siva-bakkar2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Siva-bakkar3.jpg',
    ],
  },
  {
    slug: 'elio-roze',
    url: 'https://leon.rs/p/elio-roze/',
    colorLabel: 'Pink',
    colorRe: /4813-Roze/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Roze1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Roze2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4813-Roze3.jpg',
    ],
  },
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
  return urls;
}

function filterGallery(urls, article, colorRe) {
  const prefix = `/${article}-`;
  return urls.filter((u) => u.includes(prefix) && colorRe.test(u) && !/favicon|logo\.png/i.test(u));
}

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
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

for (const page of PAGES) {
  let gallery = page.fallback;

  try {
    const res = await fetch(page.url, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (res.ok) {
      const scraped = filterGallery(extractFancyboxGallery(await res.text()), ARTICLE, page.colorRe);
      if (scraped.length) gallery = scraped;
      else console.warn(page.slug, 'scrape empty — fallback CDN list');
    }
  } catch (e) {
    console.warn(page.slug, e.message, '— fallback');
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing ${page.slug}`);

  let info = {};
  try {
    info = await fetchLeonPageInfo(page.url);
  } catch {
    /* optional */
  }

  p.category = 'children';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-elio-children';
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildProductSizes(p, info.sizes?.length ? info.sizes : CHILDREN_SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  tagsMap[p.id] = ['sandale'];

  cache[page.slug] = {
    ...(cache[page.slug] ?? {}),
    url: page.url,
    sifra: ARTICLE,
    title: p.name?.en,
    colorLabel: page.colorLabel,
    sizes: info.sizes ?? CHILDREN_SIZES,
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    page.slug,
    ARTICLE,
    'sandale',
    'imgs',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — elio-4813 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — elio-4813 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Elio 4813 done.');
