/**
 * Bjorn Crazy (4700): men's clog — 2 colours, sizes 42–49, galleries.
 * npx tsx scripts/patch-bjorn-crazy-4700.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['42', '43', '44', '45', '46', '47', '48', '49'];
const PRICE_CHF = 59;
const ARTICLE = '4700';

const PAGES = [
  {
    slug: 'bjorn-crazy-maslinasto-zelena',
    url: 'https://leon.rs/p/bjorn-crazy-maslinasto-zelena/',
    colorLabel: 'Maslinasto zelena',
    name: {
      de: 'Bjorn Crazy – Olivgrün',
      fr: 'Bjorn Crazy – Vert olive',
      en: 'Bjorn Crazy – Olive Green',
      it: 'Bjorn Crazy – Verde oliva',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/BJORN-CRAZY-MASLINASTO-ZELENA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'bjorn-crazy-siva',
    url: 'https://leon.rs/p/bjorn-crazy-siva/',
    colorLabel: 'Siva',
    name: {
      de: 'Bjorn Crazy – Grau',
      fr: 'Bjorn Crazy – Gris',
      en: 'Bjorn Crazy – Grey',
      it: 'Bjorn Crazy – Grigio',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/BJORN-CRAZY-SIVA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
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
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  const gallery = extractGallery(html, page.galleryRe);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizeList = [
    ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 42 && Number(s) <= 49)),
  ].sort((a, b) => Number(a) - Number(b));

  let p = products.find((x) => x.slug === page.slug);
  if (!p) {
    p = {
      id: `leon-${page.slug}`,
      slug: page.slug,
      brand: 'leon',
      colors: [
        { id: 'black', label: 'Schwarz', hex: '#111827' },
        { id: 'grey', label: 'Grau', hex: '#6b7280' },
        { id: 'white', label: 'Weiss', hex: '#f9fafb' },
      ],
      variants: [{ priceCHF: PRICE_CHF, stock: 10 }],
    };
    products.push(p);
  }

  p.category = 'men';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-bjorn-crazy-4700-men';
  p.name = page.name;
  p.description = {
    de: 'Herrenmodell „Bjorn Crazy“ mit bequemem, anatomischem Fussbett.',
    fr: 'Modèle homme « Bjorn Crazy » avec semelle intérieure anatomique confortable.',
    en: 'Men\'s model "Bjorn Crazy" with a comfortable anatomical footbed.',
    it: 'Modello da uomo «Bjorn Crazy» con plantare anatomico confortevole.',
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
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — bjorn-crazy-4700 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Bjorn Crazy 4700 done.');
