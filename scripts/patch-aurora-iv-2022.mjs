/**
 * Aurora IV (2022): ženska klompa — sampanj, perla; sizes 36–41; galleries + CHF price.
 * npx tsx scripts/patch-aurora-iv-2022.mjs
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
const ARTICLE = '2022';
const PRICE_CHF = 79;

const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];

const PAGES = [
  {
    slug: 'aurora-iv-sampanj',
    url: 'https://leon.rs/p/aurora-iv-sampanj/',
    colorLabel: 'SAMPANJ',
    name: {
      de: 'Aurora IV – Champagner',
      fr: 'Aurora IV – Champagne',
      en: 'Aurora IV – Champagne',
      it: 'Aurora IV – Champagne',
    },
    colorStem: 'SAMPANJ',
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-SAMPANJ.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-SAMPANJ-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-SAMPANJ-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-SAMPANJ-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-SAMPANJ-4.jpg',
    ],
  },
  {
    slug: 'aurora-iv-perla',
    url: 'https://leon.rs/p/aurora-iv-perla/',
    colorLabel: 'PERLA',
    name: {
      de: 'Aurora IV – Perle',
      fr: 'Aurora IV – Perle',
      en: 'Aurora IV – Pearl',
      it: 'Aurora IV – Perla',
    },
    colorStem: 'PERLA',
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-PERLA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-PERLA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-PERLA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-PERLA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Aurora-IV-PERLA-4.jpg',
    ],
  },
];

const DESCRIPTION = {
  de: 'Damenklompe „Aurora IV“ mit weichem, anatomischem Fussbett.',
  fr: 'Sabots femme « Aurora IV » avec semelle intérieure anatomique douce.',
  en: 'Women\'s clog "Aurora IV" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Aurora IV» con plantare anatomico morbido.',
};

function toCdnUrl(url) {
  return url
    .replace(/^https?:\/\/leon\.rs\/wp-content\/uploads\//i, 'https://cdn.leon.rs/wp-content/uploads/')
    .replace(/^\/wp-content\/uploads\//i, 'https://cdn.leon.rs/wp-content/uploads/');
}

/** Fancybox gallery + color-specific CDN filenames (excludes other colour thumbs on page). */
function extractGalleryFromHtml(html, colorStem) {
  const byIndex = new Map();
  const stemRe = new RegExp(
    `Aurora-IV-${colorStem}(?:-(\\d+))?\\.(?:jpg|jpeg|png|webp)`,
    'i'
  );
  const patterns = [
    /href=["'](https?:\/\/(?:cdn\.)?leon\.rs\/wp-content\/uploads\/[^"']+)["'][^>]*data-fancybox=["']product-gallery/gi,
    /data-fancybox=["']product-gallery["'][^>]*href=["'](https?:\/\/(?:cdn\.)?leon\.rs\/wp-content\/uploads\/[^"']+)/gi,
    /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const raw = m[1] ?? m[0];
      const url = toCdnUrl(raw);
      const stemMatch = url.match(stemRe);
      if (!stemMatch) continue;
      const idx = stemMatch[1] ? Number(stemMatch[1]) : 0;
      if (!byIndex.has(idx)) byIndex.set(idx, url);
    }
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url);
}

function extractProductId(html) {
  return html.match(/data-product_id=["'](\d+)["']/i)?.[1] ?? null;
}

async function fetchWpMediaGallery(productId) {
  if (!productId) return [];
  const res = await fetch(
    `https://leon.rs/wp-json/wp/v2/media?parent=${productId}&per_page=100`,
    { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return rows
    .map((r) => toCdnUrl(r.source_url))
    .filter((u) => typeof u === 'string' && u.length > 0);
}

function sortGalleryUrls(urls, colorStem) {
  const stemRe = new RegExp(`Aurora-IV-${colorStem}(?:-(\\d+))?\\.`, 'i');
  return [...new Set(urls)].sort((a, b) => {
    const ia = Number(a.match(stemRe)?.[1] ?? 0);
    const ib = Number(b.match(stemRe)?.[1] ?? 0);
    return ia - ib;
  });
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
    `/* AUTO-GENERATED — aurora-iv-2022 ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(map, null, 2)};\n`,
    'utf8'
  );
}

const products = loadProducts();
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const touchedIds = [];

for (const page of PAGES) {
  let gallery = page.fallbackGallery ?? [];
  const sizeList = [...SIZES];

  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (res.ok) {
    const html = await res.text();
    const productId = extractProductId(html);
    const fromHtml = extractGalleryFromHtml(html, page.colorStem);
    const fromWp = await fetchWpMediaGallery(productId);
    const merged = sortGalleryUrls(
      [...fromHtml, ...fromWp, ...(page.fallbackGallery ?? [])],
      page.colorStem
    );
    if (merged.length) gallery = merged;
    try {
      await fetchLeonPageInfo(page.url);
    } catch {
      /* optional */
    }
  } else if (!gallery.length) {
    throw new Error(`HTTP ${res.status} ${page.url}`);
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — using fallback gallery`);
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-aurora-iv-2022-women';
  p.name = page.name;
  p.description = DESCRIPTION;
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery;
  Object.assign(p, rebuildProductSizes(p, sizeList));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  touchedIds.push(p.id);

  cache[page.slug] = {
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: sizeList,
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    page.slug,
    'sizes',
    sizeList.join(','),
    'images',
    gallery.length,
    'CHF',
    PRICE_CHF,
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

patchExploreTags(touchedIds);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — aurora-iv-2022 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Aurora IV 2022 done. Explore tags:', touchedIds.join(', '));
