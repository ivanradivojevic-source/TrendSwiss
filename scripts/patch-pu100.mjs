/**
 * Ženska klompa Klasik I (PU100): bela, perla, crna; sizes 36–42; galleries from leon.rs.
 * npx tsx scripts/patch-pu100.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const ARTICLE = 'PU100';
const PRICE_CHF = 39;

const PAGES = [
  {
    slug: 'zenska-klompa-klasik-i-bela',
    url: 'https://leon.rs/p/zenska-klompa-klasik-i-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Damen-Clog Klasik I – Weiß',
      fr: 'Sabots femme Klasik I – Blanc',
      en: "Women's clog Klasik I – White",
      it: 'Zoccolo da donna Klasik I – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/zenska-klompa-klasik-i-\d+\.(?:jpg|jpeg|png|webp)/gi,
    sortGallery: (entries) =>
      entries.sort((a, b) => {
        const na = Number(a[0].match(/-(\d+)\./)?.[1] ?? 0);
        const nb = Number(b[0].match(/-(\d+)\./)?.[1] ?? 0);
        return na - nb;
      }),
  },
  {
    slug: 'zenska-klompa-klasik-i-perla',
    url: 'https://leon.rs/p/zenska-klompa-klasik-i-perla/',
    colorLabel: 'PERLA',
    name: {
      de: 'Damen-Clog Klasik I – Perle',
      fr: 'Sabots femme Klasik I – Perle',
      en: "Women's clog Klasik I – Pearl",
      it: 'Zoccolo da donna Klasik I – Perla',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Zenska-klompa-klasik-I-PERLA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'zenska-klompa-klasik-i-crna',
    url: 'https://leon.rs/p/zenska-klompa-klasik-i-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Damen-Clog Klasik I – Schwarz',
      fr: 'Sabots femme Klasik I – Noir',
      en: "Women's clog Klasik I – Black",
      it: 'Zoccolo da donna Klasik I – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Zenska-klompa-klasik-I-CRNA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
];

function extractGallery(html, page) {
  const byIndex = new Map();
  for (const m of html.matchAll(page.galleryRe)) {
    const idx = m[1] ? Number(m[1]) : 0;
    const key = page.sortGallery ? m[0] : idx;
    if (!byIndex.has(key)) byIndex.set(key, m[0]);
  }
  let entries = [...byIndex.entries()];
  if (page.sortGallery) entries = page.sortGallery(entries);
  else entries.sort((a, b) => (typeof a[0] === 'number' ? a[0] - b[0] : 0));
  return entries.map(([, url]) => url);
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
  const gallery = extractGallery(html, page);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizeList = [
    ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 36 && Number(s) <= 42)),
  ].sort((a, b) => Number(a) - Number(b));

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'women';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-zenska-klompa-klasik-i-pu100-women';
  p.name = page.name;
  p.description = {
    de: 'Damenmodell „Klasik I“ mit weichem, anatomischem Fussbett.',
    fr: 'Modèle femme « Klasik I » avec semelle intérieure anatomique douce.',
    en: 'Women\'s model "Klasik I" with a soft anatomical footbed.',
    it: 'Modello da donna «Klasik I» con plantare anatomico morbido.',
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
    'images',
    gallery.length,
    '→',
    gallery.map((u) => u.split('/').pop()).join(', ')
  );
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — pu100 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('PU100 done.');
