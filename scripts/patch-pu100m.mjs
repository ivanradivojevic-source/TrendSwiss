/**
 * Muška klompa Klasik I (PU100M): crna, bela; sizes 42–47; galleries from leon.rs.
 * npx tsx scripts/patch-pu100m.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo } from './fetch-leon-sku.mjs';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['41', '42', '43', '44', '45', '46', '47'];
const ARTICLE = 'PU100M';
const PRICE_CHF = 49;

const PAGES = [
  {
    slug: 'muska-klompa-klasik-i-crna',
    url: 'https://leon.rs/p/muska-klompa-klasik-i-crna/',
    colorLabel: 'CRNA',
    name: {
      de: 'Herren-Clog Klasik I – Schwarz',
      fr: 'Sabots homme Klasik I – Noir',
      en: "Men's clog Klasik I – Black",
      it: 'Zoccolo uomo Klasik I – Nero',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Muska-klompa-klasik-I-CRNA(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'muska-klompa-klasik-i-bela',
    url: 'https://leon.rs/p/muska-klompa-klasik-i-bela/',
    colorLabel: 'BELA',
    name: {
      de: 'Herren-Clog Klasik I – Weiß',
      fr: 'Sabots homme Klasik I – Blanc',
      en: "Men's clog Klasik I – White",
      it: 'Zoccolo uomo Klasik I – Bianco',
    },
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/PU100M-(\d+)\.(?:jpg|jpeg|png|webp)/gi,
  },
];

function extractGallery(html, page) {
  const byIndex = new Map();
  for (const m of html.matchAll(page.galleryRe)) {
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
  const gallery = extractGallery(html, page);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const info = await fetchLeonPageInfo(page.url);
  const sizeList = [
    ...new Set([...SIZES, ...(info.sizes ?? [])].filter((s) => Number(s) >= 41 && Number(s) <= 47)),
  ].sort((a, b) => Number(a) - Number(b));

  const p = products.find((x) => x.slug === page.slug);
  if (!p) throw new Error(`Missing product ${page.slug}`);

  p.category = 'men';
  p.articleNumber = ARTICLE;
  p.modelGroupId = 'leon-mg-klasik-i-pu100m-men';
  p.name = page.name;
  p.description = {
    de: 'Herrenmodell „Klasik I“ mit bequemem, anatomischem Fussbett.',
    fr: 'Modèle homme « Klasik I » avec semelle intérieure anatomique confortable.',
    en: 'Men\'s model "Klasik I" with a comfortable anatomical footbed.',
    it: 'Modello da uomo «Klasik I» con plantare anatomico confortevole.',
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
  `/* AUTO-GENERATED — pu100m ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('PU100M done.');
