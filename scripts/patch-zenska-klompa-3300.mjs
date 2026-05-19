/**
 * Ženska klompa 3300: crna, perla, bela — sizes 36–41; colour-specific DSC galleries.
 * npx tsx scripts/patch-zenska-klompa-3300.mjs
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
const ARTICLE = '3300';
const PRICE_CHF = 49;

/** Only DSC files for this colour (avoids white/pearl shots on black PDP). */
const PAGES = [
  {
    slug: 'zenska-klompa-3300-crna',
    url: 'https://leon.rs/p/zenska-klompa-3300-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Damen-Clog 3300 – Schwarz',
      fr: 'Sabots femme 3300 – Noir',
      en: "Women's clog 3300 – Black",
      it: 'Zoccolo da donna 3300 – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/DSC0723[5-8]\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'zenska-klompa-3300-perla',
    url: 'https://leon.rs/p/zenska-klompa-3300-perla/',
    colorLabel: 'PERLA',
    name: {
      de: 'Damen-Clog 3300 – Perle',
      fr: 'Sabots femme 3300 – Perle',
      en: "Women's clog 3300 – Pearl",
      it: 'Zoccolo da donna 3300 – Perla',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/DSC0719[3-6]\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'zenska-klompa-3300-bela',
    url: 'https://leon.rs/p/zenska-klompa-3300-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Damen-Clog 3300 – Weiß',
      fr: 'Sabots femme 3300 – Blanc',
      en: "Women's clog 3300 – White",
      it: 'Zoccolo da donna 3300 – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/DSC073(?:4[89]|5[01])\.(?:jpg|jpeg|png|webp)/gi,
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
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  const gallery = extractGallery(html, page.galleryRe);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizeList = [
    ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 36 && Number(s) <= 41)),
  ].sort((a, b) => Number(a) - Number(b));

  const matches = products.filter((x) => x.slug === page.slug);
  if (!matches.length) throw new Error(`Missing product ${page.slug}`);

  for (const p of matches) {
    p.category = 'women';
    p.articleNumber = ARTICLE;
    p.modelGroupId = 'leon-mg-zenska-klompa-3300-women';
    p.name = page.name;
    p.description = {
      de: 'Damenmodell „3300“ mit weichem, anatomischem Fussbett.',
      fr: 'Modèle femme « 3300 » avec semelle intérieure anatomique douce.',
      en: 'Women\'s model "3300" with a soft anatomical footbed.',
      it: 'Modello da donna «3300» con plantare anatomico morbido.',
    };
    p.colorLabel = page.colorLabel;
    p.image = gallery[0];
    p.images = gallery.length > 1 ? gallery : undefined;
    Object.assign(p, rebuildProductSizes(p, sizeList.length ? sizeList : SIZES));
    for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;
  }

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
  `/* AUTO-GENERATED — zenska-klompa-3300 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('3300 done.');
