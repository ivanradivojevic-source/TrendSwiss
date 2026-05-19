/**
 * Linea (8001): fix liena-braon (leon.rs typo slug) — women, SKU 8001, gallery.
 * npx tsx scripts/patch-linea-8001.mjs && npx tsx scripts/repair-leon-catalog.mjs && npx tsx scripts/persist-leon-normalize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const RAW_PATH = path.join(ROOT, 'data', 'leon-missing-import.raw.json');

const LIENA_BRAON_URL = 'https://leon.rs/p/liena-braon/';
/** leon.rs Linea 8001: 36–41 (no 42). */
const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41'];
const PRICE_CHF = 59;

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function writeLeonProducts(products) {
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — linea-8001 patch ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function rebuildWomenCatalogRow(p) {
  const colors = p.colors ?? [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const skuBase = p.slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const sizes = WOMEN_SIZES.map((s) => ({
    id: s,
    label: { de: s, fr: s, en: s, it: s },
  }));
  const variants = sizes.flatMap((size) =>
    colors.map((c) => ({
      size: size.id,
      color: c.id,
      sku: `LEON-${skuBase}-${size.id}-${c.id}`,
      priceCHF: PRICE_CHF,
      stock: 10,
    }))
  );
  return {
    ...p,
    category: 'women',
    articleNumber: '8001',
    sizes,
    colors,
    variants,
    images: undefined,
  };
}

async function scrapeLienaBraon() {
  const res = await fetch(LIENA_BRAON_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const name =
    (
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      'Linea – Braon'
    )
      .replace(/&#8211;/g, '–')
      .replace(/\s*[|–—]\s*Leon\s*$/i, '')
      .trim();
  const images = [
    ...new Set(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|webp)/gi)]
        .map((m) => m[0])
        .filter((u) => /8001-braon/i.test(u) && !/favicon|logo/i.test(u))
    ),
  ];
  return {
    url: LIENA_BRAON_URL,
    name,
    images,
    genderCategory: 'women',
    pathSlug: 'liena-braon',
    crumbs: [],
  };
}

function appendRawRow(row) {
  const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
  const newRaw = data.newRaw ?? [];
  const bySlug = new Map(newRaw.map((r) => [r.pathSlug, r]));
  bySlug.set(row.pathSlug, {
    ...row,
    excelBroj: '8001',
    excelNaziv: 'Linea',
    priceCHF: PRICE_CHF,
  });
  data.newRaw = [...bySlug.values()];
  const summary = data.importSummary ?? [];
  const linea = summary.find((s) => s.broj === '8001' || s.naziv === 'Linea');
  if (linea) {
    linea.urls = [...new Set([...(linea.urls ?? []), 'liena-braon', 'linea-bez', 'linea-zlatna'])];
    linea.colors = linea.urls.length;
  }
  fs.writeFileSync(RAW_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const LINEA_SLUGS = ['linea-bez', 'linea-zlatna', 'liena-braon'];

async function main() {
  const scraped = await scrapeLienaBraon();
  console.log('Scraped', scraped.pathSlug, scraped.name, scraped.images.length, 'images');
  appendRawRow(scraped);

  let products = loadLeonProducts();
  let fixed = 0;
  for (const slug of LINEA_SLUGS) {
    const p = products.find((x) => x.slug === slug);
    if (!p) {
      console.warn('Missing', slug);
      continue;
    }
    Object.assign(p, rebuildWomenCatalogRow(p));
    fixed++;
  }
  console.log('Linea sizes →', WOMEN_SIZES.join(','), 'fixed rows:', fixed);

  const cachePath = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
  if (fs.existsSync(cachePath)) {
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    for (const slug of LINEA_SLUGS) {
      if (cache[slug]) cache[slug].sizes = WOMEN_SIZES;
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }

  writeLeonProducts(products);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
