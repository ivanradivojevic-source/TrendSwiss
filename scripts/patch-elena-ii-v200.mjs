/**
 * Elena II (V200): ženska klompa — crna, bela; sizes 36–41; galleries from leon.rs.
 * npx tsx scripts/patch-elena-ii-v200.mjs
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
const ARTICLE = 'V200';
const PRICE_CHF = 39;

const PAGES = [
  {
    slug: 'elena-ii-crna',
    url: 'https://leon.rs/p/elena-ii-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Elena II – Schwarz',
      fr: 'Elena II – Noir',
      en: 'Elena II – Black',
      it: 'Elena II – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Elena-II-CRNA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-CRNA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-CRNA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-CRNA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-CRNA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-CRNA-4.jpg',
    ],
  },
  {
    slug: 'elena-ii-bela',
    url: 'https://leon.rs/p/elena-ii-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Elena II – Weiß',
      fr: 'Elena II – Blanc',
      en: 'Elena II – White',
      it: 'Elena II – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Elena-II-BELA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-BELA.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-BELA-1.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-BELA-2.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-BELA-3.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/09/Elena-II-BELA-4.jpg',
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
    throw new Error(`HTTP ${res.status} ${page.url}`);
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — using fallback gallery`);
  }

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-elena-ii-v200-women';
  p.name = page.name;
  p.description = {
    de: 'Damenmodell „Elena II“ mit weichem, anatomischem Fussbett.',
    fr: 'Modèle femme « Elena II » avec semelle intérieure anatomique douce.',
    en: 'Women\'s model "Elena II" with a soft anatomical footbed.',
    it: 'Modello da donna «Elena II» con plantare anatomico morbido.',
  };
  p.colorLabel = page.colorLabel;
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  Object.assign(p, rebuildProductSizes(p, sizeList));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

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
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — elena-ii-v200 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Elena II V200 done.');
