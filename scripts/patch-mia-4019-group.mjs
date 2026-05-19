/**
 * Mia (4019): 3 boje bakkar — odvojeno od Mia II Orlando.
 * npx tsx scripts/patch-mia-4019-group.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLeonProductContent } from './leon-extract-page-content.mjs';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const ARTICLE = '4019';
const PRICE_CHF = 49;
const SIZES = sizesForArticle(ARTICLE) ?? ['36', '37', '38', '39', '40', '41', '42'];
const GROUP_4019 = 'leon-mg-mia-4019-women';
const GROUP_II = 'leon-mg-mia-ii-women';

const MIA_4019 = [
  {
    slug: 'mia-roze-bakkar',
    color: { id: 'roze-bakkar', label: 'Pink patent', hex: '#d4849a' },
    colorLabel: 'ROZE BAKKAR',
    name: {
      de: 'Mia – Rosa Lack',
      fr: 'Mia – Rose verni',
      en: 'Mia – Pink patent',
      it: 'Mia – Rosa verniciato',
    },
  },
  {
    slug: 'mia-crna-bakkar',
    color: { id: 'crna-bakkar', label: 'Black patent', hex: '#111827' },
    colorLabel: 'CRNA BAKKAR',
    name: {
      de: 'Mia – Schwarz Lack',
      fr: 'Mia – Noir verni',
      en: 'Mia – Black patent',
      it: 'Mia – Nero verniciato',
    },
  },
  {
    slug: 'mia-bela-bakkar',
    color: { id: 'bela-bakkar', label: 'White patent', hex: '#f5f5f4' },
    colorLabel: 'BELA BAKKAR',
    name: {
      de: 'Mia – Weiß Lack',
      fr: 'Mia – Blanc verni',
      en: 'Mia – White patent',
      it: 'Mia – Bianco verniciato',
    },
  },
];

const MIA_II = [
  {
    slug: 'mia-ii-orlando-braon',
    color: { id: 'orlando-braon', label: 'Orlando brown', hex: '#6b4f3a' },
    colorLabel: 'ORLANDO BRAON',
    name: {
      de: 'Mia II – Orlando Braun',
      fr: 'Mia II – Orlando marron',
      en: 'Mia II – Orlando brown',
      it: 'Mia II – Orlando marrone',
    },
    imageStem: 'MIA-II-ORLANDO-BRAON',
  },
  {
    slug: 'mia-ii-orlando-crvena',
    color: { id: 'orlando-crvena', label: 'Orlando red', hex: '#9b2d30' },
    colorLabel: 'ORLANDO CRVENA',
    name: {
      de: 'Mia II – Orlando Rot',
      fr: 'Mia II – Orlando rouge',
      en: 'Mia II – Orlando red',
      it: 'Mia II – Orlando rosso',
    },
    imageStem: 'MIA-II-ORLANDO-CRVENA',
  },
];

function extractFancyboxGallery(html, stemRe) {
  const urls = [];
  for (const re of [
    /href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*data-fancybox=["']product-gallery/gi,
    /data-fancybox=["']product-gallery["'][^>]*href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi,
  ]) {
    for (const m of html.matchAll(re)) {
      if (m[1] && !urls.includes(m[1])) urls.push(m[1]);
    }
  }
  return urls.filter((u) => stemRe.test(u) && !/favicon|logo/i.test(u));
}

function galleryFromStem(stem) {
  const base = `https://cdn.leon.rs/wp-content/uploads/2025/09/${stem}`;
  const urls = [`${base}.jpg`];
  for (let i = 1; i <= 4; i++) urls.push(`${base}-${i}.jpg`);
  return urls;
}

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

for (const cfg of MIA_4019) {
  const p = products.find((x) => x.slug === cfg.slug);
  if (!p) throw new Error(`Missing ${cfg.slug}`);

  const url = `https://leon.rs/p/${cfg.slug}/`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${cfg.slug} HTTP ${res.status}`);
  const html = await res.text();
  const gallery = extractFancyboxGallery(html, /MIA-(?!II)/i);
  if (gallery.length) {
    p.image = gallery[0];
    p.images = gallery;
  }

  const content = extractLeonProductContent(html);
  if (content.description) {
    // keep existing translated description/specs from sync if present
    if (!p.description?.en?.includes('anatomical mule') && !p.description?.en?.includes('footbed')) {
      // generic only — will be filled by re-sync; skip auto-translate here
    }
  }

  p.modelGroupId = GROUP_4019;
  p.articleNumber = ARTICLE;
  p.colorLabel = cfg.colorLabel;
  p.name = cfg.name;
  p.colors = [cfg.color];
  Object.assign(p, rebuildProductSizes({ ...p, colors: [cfg.color] }, SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  cache[cfg.slug] = {
    url,
    sifra: ARTICLE,
    title: p.name.en,
    colorLabel: cfg.colorLabel,
    fetchedAt: new Date().toISOString(),
    sizes: SIZES,
  };
  console.log('4019', cfg.slug, 'images', p.images?.length);
}

for (const cfg of MIA_II) {
  const p = products.find((x) => x.slug === cfg.slug);
  if (!p) throw new Error(`Missing ${cfg.slug}`);

  p.modelGroupId = GROUP_II;
  delete p.articleNumber;
  p.colorLabel = cfg.colorLabel;
  p.name = cfg.name;
  p.colors = [cfg.color];
  p.image = galleryFromStem(cfg.imageStem)[0];
  p.images = galleryFromStem(cfg.imageStem);
  Object.assign(p, rebuildProductSizes({ ...p, colors: [cfg.color] }, SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  const url = `https://leon.rs/p/${cfg.slug}/`;
  cache[cfg.slug] = {
    url,
    title: p.name.en,
    colorLabel: cfg.colorLabel,
    fetchedAt: new Date().toISOString(),
    sizes: SIZES,
    note: 'leon.rs page may be offline; CDN images kept',
  };
  console.log('Mia II', cfg.slug, 'images', p.images?.length);
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — mia-4019-group ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Done — Mia 4019:', MIA_4019.length, 'boja; Mia II:', MIA_II.length, 'boja (odvojena grupa).');
