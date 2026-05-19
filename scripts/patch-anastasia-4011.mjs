/**
 * Anastasia (4011): jedina boja na leon.rs — zlato zmija; osveži galeriju i cenu.
 * npx tsx scripts/patch-anastasia-4011.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes, sizesForArticle } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const ARTICLE = '4011';
const PRICE_CHF = 59;
const SIZES = sizesForArticle(ARTICLE) ?? ['35', '36', '37', '38', '39', '40', '41', '42'];
const URL = 'https://leon.rs/p/anastasia-zlato-zmija/';
const SLUG = 'anastasia-zlato-zmija';

/** From leon.rs tab Opis — https://leon.rs/p/anastasia-zlato-zmija/ */
const DESCRIPTION = {
  de: 'Anatomische Damen-Pantolette mit speziell geformtem Fußbett und Massagegel. Aus natürlichem Material – Leder – mit Polyurethan-Laufsohle.',
  fr: 'Mule anatomique pour femme avec assise plantaire spécialement façonnée et gel massage. En matériau naturel – cuir – avec semelle extérieure en polyuréthane.',
  en: 'Women\'s anatomical mule with a specially shaped footbed and massage gel. Made from natural material – leather – with a polyurethane outsole.',
  it: 'Mule anatomica da donna con plantare sagomato e gel massaggiante. In materiale naturale – pelle – con suola esterna in poliuretano.',
};

const PRODUCT_COLOR = {
  id: 'zlato-zmija',
  label: 'Gold snake',
  hex: '#c9a227',
};

/** leon.rs: Sastav lica, Podnožje, Đon */
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
  return urls.filter((u) => /ANASTASIA|anastasia|4011/i.test(u) && !/favicon|logo/i.test(u));
}

const products = JSON.parse(
  fs.readFileSync(OUT_TS, 'utf8').match(/export const leonProducts = (\[[\s\S]*\]);/)[1]
);
const p = products.find((x) => x.slug === SLUG);
if (!p) throw new Error(`Missing ${SLUG}`);

const res = await fetch(URL, { headers: { 'user-agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const gallery = extractFancyboxGallery(await res.text());
if (gallery.length) {
  p.image = gallery[0];
  p.images = gallery;
}
p.articleNumber = ARTICLE;
p.modelGroupId = 'leon-mg-anastasia-4011-women';
p.colorLabel = 'ZLATO ZMIJA';
p.name = {
  de: 'Anastasia – Gold Schlangenprägung',
  fr: 'Anastasia – Or relief serpent',
  en: 'Anastasia – Gold snake',
  it: 'Anastasia – Oro serpente',
};
p.description = DESCRIPTION;
p.specifications = SPECIFICATIONS;
p.colors = [PRODUCT_COLOR];
Object.assign(
  p,
  rebuildProductSizes({ ...p, colors: [PRODUCT_COLOR] }, SIZES)
);
for (const v of p.variants ?? []) v.priceCHF = PRICE_CHF;

const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
cache[SLUG] = { url: URL, sifra: ARTICLE, fetchedAt: new Date().toISOString() };

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — anastasia-4011 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log(SLUG, 'images', p.images?.length, 'CHF', PRICE_CHF);
