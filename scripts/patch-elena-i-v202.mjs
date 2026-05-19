/**
 * Elena I (V202): ženska klompa — crna, bela; sizes 36–41; galleries from leon.rs.
 * npx tsx scripts/patch-elena-i-v202.mjs
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
const ARTICLE = 'V202';
const PRICE_CHF = 39;

const PAGES = [
  {
    slug: 'elena-i-crna',
    url: 'https://leon.rs/p/elena-i-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Elena I – Schwarz',
      fr: 'Elena I – Noir',
      en: 'Elena I – Black',
      it: 'Elena I – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/DSC0700[4-7]\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC07004.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC07005.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC07006.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC07007.jpg',
    ],
  },
  {
    slug: 'elena-i-bela',
    url: 'https://leon.rs/p/elena-i-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Elena I – Weiß',
      fr: 'Elena I – Blanc',
      en: 'Elena I – White',
      it: 'Elena I – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/DSC0551[0-3]\.(?:jpg|jpeg|png|webp)/gi,
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05510.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05512.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05513.jpg',
    ],
  },
];

function extractGallery(html, re) {
  const urls = [...new Set([...html.matchAll(re)].map((m) => m[0]))];
  return urls.sort((a, b) => {
    const na = Number(a.match(/DSC(\d+)/)?.[1] ?? 0);
    const nb = Number(b.match(/DSC(\d+)/)?.[1] ?? 0);
    return na - nb;
  });
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
  if (!p) throw new Error(`Missing product ${page.slug} — add to catalog first`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-elena-i-v202-women';
  p.name = page.name;
  p.description = {
    de: 'Damenmodell „Elena I“ mit weichem, anatomischem Fussbett.',
    fr: 'Modèle femme « Elena I » avec semelle intérieure anatomique douce.',
    en: 'Women\'s model "Elena I" with a soft anatomical footbed.',
    it: 'Modello da donna «Elena I» con plantare anatomico morbido.',
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
  `/* AUTO-GENERATED — elena-i-v202 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Elena I V202 done.');
