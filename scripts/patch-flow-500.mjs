/**
 * Flow (500): women category, sizes 36–42, SKU 500, gallery from leon.rs (4 colours).
 * npx tsx scripts/patch-flow-500.mjs && npx tsx scripts/repair-leon-catalog.mjs && npx tsx scripts/persist-leon-normalize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const RAW_PATH = path.join(ROOT, 'data', 'leon-missing-import.raw.json');

const FLOW_URLS = [
  'https://leon.rs/p/flow-zelena-perlato/',
  'https://leon.rs/p/flow-crna/',
  'https://leon.rs/p/flow-bela/',
  'https://leon.rs/p/flow-perla/',
];

const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const PRICE_CHF = 47;

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function writeLeonProducts(products) {
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — flow-500 patch ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function isFlowSlug(slug) {
  return typeof slug === 'string' && slug.startsWith('flow-');
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
    articleNumber: '500',
    sizes,
    colors,
    variants,
    images: undefined,
  };
}

async function scrapeFlowPage(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const html = await res.text();
  const pathSlug = url.match(/\/p\/([^/]+)\//)?.[1] ?? '';
  let name =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
    'Flow';
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
  return { url, name, images, genderCategory: 'women', pathSlug, crumbs: [] };
}

function appendRawRows(rows) {
  const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
  const newRaw = data.newRaw ?? [];
  const bySlug = new Map(newRaw.map((r) => [r.pathSlug, r]));
  for (const row of rows) {
    bySlug.set(row.pathSlug, {
      ...row,
      excelBroj: '500',
      excelNaziv: 'Flow',
      priceCHF: PRICE_CHF,
    });
  }
  data.newRaw = [...bySlug.values()];
  fs.writeFileSync(RAW_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const scraped = [];
  for (const url of FLOW_URLS) {
    const row = await scrapeFlowPage(url);
    scraped.push(row);
    console.log('Scraped', row.pathSlug, row.name);
  }
  appendRawRows(scraped);

  let products = loadLeonProducts();
  const scrapedBySlug = new Map(scraped.map((r) => [r.pathSlug, r]));
  let fixed = 0;
  let added = 0;

  for (const row of scraped) {
    let p = products.find((x) => x.slug === row.pathSlug);
    const primary =
      row.images.find((u) => /\/500-/i.test(u) && !/favicon|logo/i.test(u)) ?? row.images[0];
    if (!p) {
      const template = products.find((x) => x.slug === 'flow-bela') ?? products.find(isFlowSlug);
      if (!template) throw new Error('No Flow template in catalog');
      p = rebuildWomenCatalogRow({
        ...template,
        id: `leon-${row.pathSlug}`,
        slug: row.pathSlug,
        image: primary,
      });
      products.push(p);
      added++;
      console.log('Added', row.pathSlug);
    } else {
      if (primary) p.image = primary;
      Object.assign(p, rebuildWomenCatalogRow(p));
      fixed++;
    }
  }

  console.log('Fixed', fixed, 'Added', added);
  writeLeonProducts(products);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
