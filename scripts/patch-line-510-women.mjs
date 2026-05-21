/**
 * Line (510) ženske papuče — women kategorija, galerije po boji, explore tag papuce.
 * npx tsx scripts/patch-line-510-women.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = '510';
const MODEL_GROUP = 'leon-mg-line-510-women';
const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const PRICE_CHF = 49;

const WOMEN_DESC = {
  de: 'Damenmodell „Line“ mit weichem, anatomischem Fussbett.',
  fr: 'Modèle femme « Line » avec semelle intérieure anatomique douce.',
  en: 'Women\'s model "Line" with a soft anatomical footbed.',
  it: 'Modello da donna «Line» con plantare anatomico morbido.',
};

const PAGES = [
  {
    slug: 'line-zelena',
    url: 'https://leon.rs/p/line-zelena/',
    colorLabel: 'Green',
    colorRe: /510-Zelena/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Zelena1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Zelena2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Zelena3.jpg',
    ],
  },
  {
    slug: 'line-braon',
    url: 'https://leon.rs/p/line-braon/',
    colorLabel: 'Brown',
    colorRe: /510-Tamno-braon/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Tamno-braon1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Tamno-braon2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Tamno-braon3.jpg',
    ],
  },
  {
    slug: 'line-siva',
    url: 'https://leon.rs/p/line-siva/',
    colorLabel: 'Grey',
    colorRe: /510-Siva-velur/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Siva-velur1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Siva-velur2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Siva-velur3.jpg',
    ],
  },
  {
    slug: 'line-crna',
    url: 'https://leon.rs/p/line-crna/',
    colorLabel: 'Black',
    colorRe: /510-Crna-velur/i,
    fallback: [
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Crna-velur1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Crna-velur2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Crna-velur3.jpg',
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

function filterGallery(urls, colorRe) {
  const prefix = `/${ARTICLE}-`;
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

function rebuildWomenSizes(p) {
  const colors = p.colors ?? [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const skuBase = p.slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const sizes = WOMEN_SIZES.map((s) => ({
    id: s,
    label: { de: s, fr: s, en: s, it: s },
  }));
  const variants = sizes.flatMap((size) =>
    colors.map((c) => ({
      size: size.id,
      color: c.id,
      sku: `LEON-${skuBase}-${size.id}-${c.id}`,
      priceCHF: PRICE_CHF,
      stock: 10,
    }))
  );
  return { sizes, colors, variants };
}

const products = loadProducts();
const tagsMap = loadTags();

for (const page of PAGES) {
  let gallery = page.fallback;

  try {
    const res = await fetch(page.url, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (res.ok) {
      const scraped = filterGallery(extractFancyboxGallery(await res.text()), page.colorRe);
      if (scraped.length) gallery = scraped;
      else console.warn(page.slug, 'scrape empty — fallback');
    }
  } catch (e) {
    console.warn(page.slug, e.message, '— fallback');
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = MODEL_GROUP;
  p.colorLabel = page.colorLabel;
  p.description = { ...WOMEN_DESC };
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildWomenSizes(p));

  tagsMap[p.id] = ['papuce'];

  console.log(
    page.slug,
    'women',
    'papuce',
    'imgs',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — line-510-women ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(
  TAGS_TS,
  `/* AUTO-GENERATED — line-510-women ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
  'utf8'
);
console.log('Line 510 women slippers done.');
