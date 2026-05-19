/**
 * Helen (4300): opis + specifikacije sa leon.rs (oba slug-a; roze stranica 404 — isti tekst modela).
 * npx tsx scripts/patch-helen-4300.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const ARTICLE = '4300';
const PRICE_CHF = 59;
const SIZES = sizesForArticle(ARTICLE) ?? ['35', '36', '37', '38', '39', '40', '41', '42'];
const MODEL_GROUP = 'leon-mg-helen-4300-women';

/** leon.rs/p/helen-zlato-zmija/ — Opis */
const DESCRIPTION = {
  de: 'Anatomische Damen-Sandale mit speziell geformtem Fußbett und Massagegel. Aus natürlichem Material – Leder – mit Polyurethan-Laufsohle. Obermaterial mit verstellbarem Klettverschluss.',
  fr: 'Sandale anatomique pour femme avec assise plantaire spécialement façonnée et gel massage. En matériau naturel – cuir – avec semelle extérieure en polyuréthane. Tige avec scratch réglable.',
  en: "Women's anatomical sandal with a specially shaped footbed and massage gel. Made from natural material – leather – with a polyurethane outsole. Upper with adjustable Velcro.",
  it: 'Sandalo anatomico da donna con plantare sagomato e gel massaggiante. In materiale naturale – pelle – con suola esterna in poliuretano. Tomaia con velcro regolabile.',
};

const SPECIFICATIONS = [
  {
    label: {
      de: 'Obermaterial',
      fr: 'Composition du dessus',
      en: 'Upper material',
      it: 'Tomaia',
    },
    value: {
      de: 'Naturleder',
      fr: 'Cuir naturel',
      en: 'Natural leather',
      it: 'Pelle naturale',
    },
  },
  {
    label: {
      de: 'Fußbett',
      fr: 'Semelle intérieure',
      en: 'Footbed',
      it: 'Plantare',
    },
    value: {
      de: 'Naturleder mit anatomischem Fußbett und weichem Gel-Einlage',
      fr: 'Cuir naturel avec assise plantaire anatomique et insert en gel souple',
      en: 'Natural leather with anatomical footbed and soft gel inlay',
      it: 'Pelle naturale con plantare anatomico e sottopiede in gel morbido',
    },
  },
  {
    label: {
      de: 'Laufsohle',
      fr: 'Semelle extérieure',
      en: 'Outsole',
      it: 'Suola',
    },
    value: {
      de: 'Polyurethan',
      fr: 'Polyuréthane',
      en: 'Polyurethane',
      it: 'Poliuretano',
    },
  },
];

const VARIANTS = [
  {
    slug: 'helen-zlato-zmija',
    url: 'https://leon.rs/p/helen-zlato-zmija/',
    color: { id: 'zlato-zmija', label: 'Gold snake', hex: '#c9a227' },
    colorLabel: 'ZLATO ZMIJA',
    imageStem: 'HELEN-ZLATO-ZMIJA',
    name: {
      de: 'Helen – Gold Schlangenprägung',
      fr: 'Helen – Or relief serpent',
      en: 'Helen – Gold snake',
      it: 'Helen – Oro serpente',
    },
  },
  {
    slug: 'helen-roze-zmija',
    url: 'https://leon.rs/p/helen-roze-zmija/',
    color: { id: 'roze-zmija', label: 'Pink snake', hex: '#d4849a' },
    colorLabel: 'ROZE ZMIJA',
    imageStem: 'HELEN-ROZE-ZMIJA',
    name: {
      de: 'Helen – Rosa Schlangenprägung',
      fr: 'Helen – Rose relief serpent',
      en: 'Helen – Pink snake',
      it: 'Helen – Rosa serpente',
    },
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

for (const cfg of VARIANTS) {
  const p = products.find((x) => x.slug === cfg.slug);
  if (!p) throw new Error(`Missing ${cfg.slug}`);

  const stemRe = new RegExp(cfg.imageStem.replace(/-/g, '[-_]'), 'i');
  const res = await fetch(cfg.url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (res.ok) {
    const gallery = extractFancyboxGallery(await res.text(), stemRe);
    if (gallery.length) {
      p.image = gallery[0];
      p.images = gallery;
    }
  } else {
    p.image = galleryFromStem(cfg.imageStem)[0];
    p.images = galleryFromStem(cfg.imageStem);
  }

  p.modelGroupId = MODEL_GROUP;
  p.articleNumber = ARTICLE;
  p.colorLabel = cfg.colorLabel;
  p.name = cfg.name;
  p.description = DESCRIPTION;
  p.specifications = SPECIFICATIONS;
  p.colors = [cfg.color];
  Object.assign(p, rebuildProductSizes({ ...p, colors: [cfg.color] }, SIZES));
  for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

  cache[cfg.slug] = {
    url: cfg.url,
    sifra: ARTICLE,
    title: cfg.name.en,
    colorLabel: cfg.colorLabel,
    fetchedAt: new Date().toISOString(),
    sizes: SIZES,
    ...(res.ok ? {} : { note: 'leon.rs 404 — CDN galerija' }),
  };
  console.log(cfg.slug, 'images', p.images?.length, res.ok ? 'leon ok' : 'cdn only');
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — helen-4300 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('Helen 4300 —', VARIANTS.length, 'boje, opis + specifikacije.');
