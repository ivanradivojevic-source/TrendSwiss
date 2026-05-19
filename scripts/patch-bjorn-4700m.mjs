/**
 * Bjorn (4700M): men's clog — teget, crna, bela; sizes 42–49.
 * npx tsx scripts/patch-bjorn-4700m.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildProductSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const SIZES = ['42', '43', '44', '45', '46', '47', '48', '49'];
const ARTICLE = '4700M';
const SLUGS = ['bjorn-teget', 'bjorn-crna', 'bjorn-bela'];

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const products = loadProducts();
let fixed = 0;

for (const slug of SLUGS) {
  const p = products.find((x) => x.slug === slug);
  if (!p) {
    console.warn('Missing', slug);
    continue;
  }
  const priceCHF = p.variants?.find((v) => typeof v.priceCHF === 'number')?.priceCHF ?? 59;
  p.articleNumber = ARTICLE;
  p.category = 'men';
  p.modelGroupId = 'leon-mg-bjorn-4700m-men';
  p.description = {
    de: 'Herrenmodell „Bjorn“ mit bequemem, anatomischem Fussbett.',
    fr: 'Modèle homme « Bjorn » avec semelle intérieure anatomique confortable.',
    en: 'Men\'s model "Bjorn" with a comfortable anatomical footbed.',
    it: 'Modello da uomo «Bjorn» con plantare anatomico confortevole.',
  };
  Object.assign(p, rebuildProductSizes(p, SIZES));
  for (const v of p.variants ?? []) v.priceCHF = priceCHF;
  fixed++;
  console.log(slug, '→', SIZES.join(','));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — bjorn-4700m ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

if (fs.existsSync(CACHE_PATH)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  for (const slug of SLUGS) {
    if (cache[slug]) {
      cache[slug].sifra = ARTICLE;
      cache[slug].sizes = SIZES;
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

console.log('Bjorn 4700M fixed:', fixed);
