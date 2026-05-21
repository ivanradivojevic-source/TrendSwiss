/**
 * Stella I (4811) papuče, Stella II (4812) sandale — galerije samo svoje boje/modela sa leon.rs.
 * npx tsx scripts/patch-stella-4811-4812.mjs
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

const PAGES = [
  {
    slug: 'stella-i-zlatna',
    url: 'https://leon.rs/p/stella-i-zlatna/',
    article: '4811',
    modelGroupId: 'leon-mg-stella-i-children',
    exploreTags: ['papuce'],
    colorLabel: 'Gold',
    colorRe: /4811-Zlato/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Zlato1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Zlato2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Zlato3.jpg',
    ],
  },
  {
    slug: 'stella-i-roze',
    url: 'https://leon.rs/p/stella-i-roze/',
    article: '4811',
    modelGroupId: 'leon-mg-stella-i-children',
    exploreTags: ['papuce'],
    colorLabel: 'Pink',
    colorRe: /4811-Roze/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Roze1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Roze2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4811-Roze3.jpg',
    ],
  },
  {
    slug: 'stella-ii-zlatna',
    url: 'https://leon.rs/p/stella-ii-zlatna/',
    article: '4812',
    modelGroupId: 'leon-mg-stella-ii-children',
    exploreTags: ['sandale'],
    colorLabel: 'Gold',
    colorRe: /4812-Zlato/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Zlato1-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Zlato2-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Zlato3-1.jpg',
    ],
  },
  {
    slug: 'stella-ii-roze',
    url: 'https://leon.rs/p/stella-ii-roze/',
    article: '4812',
    modelGroupId: 'leon-mg-stella-ii-children',
    exploreTags: ['sandale'],
    colorLabel: 'Pink',
    colorRe: /4812-Roze/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Roze-velur1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Roze-velur2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/4812-Roze-velur3.jpg',
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
      const scraped = filterGallery(extractFancyboxGallery(await res.text()), page.article, page.colorRe);
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
  p.articleNumber = page.article;
  p.modelGroupId = page.modelGroupId;
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildProductSizes(p, info.sizes?.length ? info.sizes : CHILDREN_SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  tagsMap[p.id] = page.exploreTags;

  cache[page.slug] = {
    ...(cache[page.slug] ?? {}),
    url: page.url,
    sifra: page.article,
    title: p.name?.en,
    colorLabel: page.colorLabel,
    sizes: info.sizes ?? CHILDREN_SIZES,
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    page.slug,
    page.article,
    page.exploreTags.join(','),
    'imgs',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — stella-4811-4812 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — stella-4811-4812 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Stella 4811/4812 done.');
