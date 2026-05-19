/**
 * Ruby (953): 2 boje sa leon.rs; 59 CHF; veličine 35–42.
 * npx tsx scripts/patch-ruby-953.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const TAGS_TS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');

const ARTICLE = '953';
const PRICE_CHF = 59;
const SIZES = sizesForArticle(ARTICLE) ?? ['35', '36', '37', '38', '39', '40', '41', '42'];
const EXPLORE_TAGS = ['klompe', 'medicinske-klompe'];
const MODEL_GROUP = 'leon-mg-ruby-953-women';

const PAGES = [
  {
    slug: 'ruby-crna',
    url: 'https://leon.rs/p/ruby-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Ruby – Schwarz',
      fr: 'Ruby – Noir',
      en: 'Ruby – Black',
      it: 'Ruby – Nero',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC06975.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC06977.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC06978.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC07085.jpg',
    ],
  },
  {
    slug: 'ruby-bela',
    url: 'https://leon.rs/p/ruby-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Ruby – Weiß',
      fr: 'Ruby – Blanc',
      en: 'Ruby – White',
      it: 'Ruby – Bianco',
    },
    fallbackGallery: [
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05419.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05498.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05422.jpg',
      'https://cdn.leon.rs/wp-content/uploads/2025/10/DSC05421.jpg',
    ],
  },
];

const DESCRIPTION = {
  de: 'Damenpapuča „Ruby“ mit weichem, anatomischem Fussbett.',
  fr: 'Mules femme « Ruby » avec semelle intérieure anatomique douce.',
  en: 'Women\'s mule "Ruby" with a soft anatomical footbed.',
  it: 'Zoccolo da donna «Ruby» con plantare anatomico morbido.',
};

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

function stemFromUrl(url) {
  return url?.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)/i)?.[1] ?? '';
}

function filterGalleryByPrimary(primaryUrl, urls) {
  const primaryStem = stemFromUrl(primaryUrl);
  const family = primaryStem.replace(/\d+$/i, '');
  const kept = urls.filter((u) => {
    const s = stemFromUrl(u);
    if (/favicon|logo\.png/i.test(u)) return false;
    if (!family) return true;
    return s.startsWith(family) || family.startsWith(s.replace(/\d+$/i, ''));
  });
  const out = [primaryUrl];
  for (const u of kept) {
    if (u !== primaryUrl && !out.includes(u)) out.push(u);
  }
  return out.length > 1 ? out : urls.filter((u) => !/favicon|logo\.png/i.test(u)).slice(0, 8);
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function makeColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
}

function buildProduct(page, gallery) {
  const colors = makeColors();
  const base = {
    id: `leon-${page.slug}`,
    slug: page.slug,
    category: 'women',
    brand: 'leon',
    modelGroupId: MODEL_GROUP,
    articleNumber: ARTICLE,
    name: page.name,
    description: DESCRIPTION,
    colorLabel: page.colorLabel,
    image: gallery[0],
    images: gallery,
    colors,
  };
  const sized = rebuildProductSizes(base, SIZES);
  for (const v of sized.variants ?? []) v.priceCHF = PRICE_CHF;
  return { ...base, ...sized };
}

function patchExploreTags(productIds) {
  const text = fs.readFileSync(TAGS_TS, 'utf8');
  const m = text.match(/export const leonExploreTagsByProductId = (\{[\s\S]*\});/);
  if (!m) throw new Error('Could not parse leonExploreTagsByProductId');
  const map = JSON.parse(m[1]);
  for (const id of productIds) map[id] = EXPLORE_TAGS;
  fs.writeFileSync(
    TAGS_TS,
    `/* AUTO-GENERATED — ruby-953 ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(map, null, 2)};\n`,
    'utf8'
  );
}

const REMOVE_SLUGS = new Set(['alpen-komfort-246', 'alpen-komfort-248']);
let products = loadProducts().filter((p) => p?.id && p?.slug && !REMOVE_SLUGS.has(p.slug));
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const touchedIds = [];

for (const page of PAGES) {
  let gallery = page.fallbackGallery ?? [];

  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (res.ok) {
    const html = await res.text();
    const fancy = extractFancyboxGallery(html);
    if (fancy.length) {
      gallery = filterGalleryByPrimary(fancy[0], fancy);
    } else {
      const all = [
        ...new Set(
          [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
            (m) => m[0]
          )
        ),
      ].filter((u) => !/favicon|logo\.png/i.test(u));
      const primary = page.fallbackGallery?.[0];
      if (primary && all.includes(primary)) gallery = filterGalleryByPrimary(primary, all);
    }
  } else {
    console.warn(page.slug, `leon.rs ${res.status} — fallback gallery`);
  }

  const built = buildProduct(page, gallery);
  const idx = products.findIndex((x) => x.slug === page.slug);
  if (idx < 0) products.push(built);
  else products[idx] = built;

  cache[page.slug] = {
    url: page.url,
    sifra: ARTICLE,
    title: page.name.en,
    colorLabel: page.colorLabel,
    sizes: SIZES,
    fetchedAt: new Date().toISOString(),
  };
  touchedIds.push(built.id);

  console.log(
    page.slug,
    'CHF',
    PRICE_CHF,
    'images',
    gallery.length,
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

patchExploreTags(touchedIds);

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — ruby-953 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Ruby 953 done.', touchedIds.length, 'colors');
