/**
 * Line (510): fix women category/sizes, add missing line-crna, seed raw gallery rows.
 * npx tsx scripts/patch-line-510.mjs && npx tsx scripts/repair-leon-catalog.mjs && npx tsx scripts/persist-leon-normalize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const RAW_PATH = path.join(ROOT, 'data', 'leon-missing-import.raw.json');

const LINE_URLS = [
  'https://leon.rs/p/line-zelena/',
  'https://leon.rs/p/line-braon/',
  'https://leon.rs/p/line-siva/',
  'https://leon.rs/p/line-crna/',
];

const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const PRICE_CHF = 49;

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function writeLeonProducts(products) {
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — line-510 patch ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function isLineSlug(slug) {
  return typeof slug === 'string' && slug.startsWith('line-') && !slug.startsWith('linea-');
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
    articleNumber: '510',
    sizes,
    colors,
    variants,
  };
}

async function scrapeLinePage(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const html = await res.text();
  const pathSlug = url.match(/\/p\/([^/]+)\//)?.[1] ?? '';
  let name =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
    'Line';
  name = name
    .replace(/&#8211;/g, '–')
    .replace(/\s*[|–—]\s*Leon\s*$/i, '')
    .trim();
  const images = [
    ...new Set(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|webp)/gi)].map(
        (m) => m[0]
      )
    ),
  ];
  const crumbs = [
    ...html.matchAll(/"itemListElement"[\s\S]*?"@id"\s*:\s*"([^"]+leon\.rs[^"]+)"/gi),
  ].map((m) => m[1]);
  const genderCategory = /zenske-papuce|ženske/i.test(html) ? 'women' : 'women';
  return { url, name, images, genderCategory, pathSlug, crumbs };
}

function appendRawRows(rows) {
  const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
  const newRaw = data.newRaw ?? [];
  const bySlug = new Map(newRaw.map((r) => [r.pathSlug, r]));
  for (const row of rows) {
    bySlug.set(row.pathSlug, {
      ...row,
      excelBroj: '510',
      excelNaziv: 'Line',
      priceCHF: PRICE_CHF,
    });
  }
  data.newRaw = [...bySlug.values()];
  fs.writeFileSync(RAW_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const scraped = [];
  for (const url of LINE_URLS) {
    const row = await scrapeLinePage(url);
    scraped.push(row);
    console.log('Scraped', row.pathSlug, row.name);
  }
  appendRawRows(scraped);

  let products = loadLeonProducts();
  let fixed = 0;
  for (const p of products) {
    if (!isLineSlug(p.slug)) continue;
    Object.assign(p, rebuildWomenCatalogRow(p));
    fixed++;
  }
  console.log('Fixed existing Line rows:', fixed);

  if (!products.some((p) => p.slug === 'line-crna')) {
    const template = products.find((p) => p.slug === 'line-zelena');
    const raw = scraped.find((r) => r.pathSlug === 'line-crna');
    if (!template || !raw) throw new Error('Missing template or line-crna scrape');
    const primary =
      raw.images.find((u) => /510-crna-velur1/i.test(u)) ??
      'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Crna-velur1.jpg';
    const crna = rebuildWomenCatalogRow({
      ...template,
      id: 'leon-line-crna',
      slug: 'line-crna',
      image: primary,
      images: undefined,
      colorLabel: 'Crna',
    });
    products.push(crna);
    console.log('Added line-crna');
  }

  writeLeonProducts(products);
  console.log('Wrote', OUT_TS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
