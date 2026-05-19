/**
 * Nino (4810): fix galleries — only images for matching colour (4810-Siva / Braon / Roze).
 * npx tsx scripts/patch-nino-4810-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const NINO_PAGES = [
  {
    slug: 'nino-siva',
    url: 'https://leon.rs/p/nino-siva/',
    colorToken: 'Siva',
  },
  {
    slug: 'nino-braon',
    url: 'https://leon.rs/p/nino-braon/',
    colorToken: 'Braon',
  },
  {
    slug: 'nino-roze',
    url: 'https://leon.rs/p/nino-roze/',
    colorToken: 'Roze',
  },
];

/** Gallery filenames: 4810-Siva-velur1.jpg … only this colour, sorted by index. */
function extractNinoGalleryFromHtml(html, colorToken) {
  const esc = colorToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `https://cdn\\.leon\\.rs/wp-content/uploads/[^"'\\s>]+/4810-${esc}-velur(\\d+)\\.(?:jpg|jpeg|png|webp)`,
    'gi'
  );
  const byIndex = new Map();
  for (const m of html.matchAll(re)) {
    const idx = Number(m[1]);
    if (!byIndex.has(idx)) byIndex.set(idx, m[0]);
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url);
}

async function scrapeProductGallery(url, colorToken) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const html = await res.text();
  const filtered = extractNinoGalleryFromHtml(html, colorToken);
  if (!filtered.length) throw new Error(`No 4810-${colorToken} images on ${url}`);
  return filtered;
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const products = loadProducts();

for (const page of NINO_PAGES) {
  const gallery = await scrapeProductGallery(page.url, page.colorToken);
  const p = products.find((x) => x.slug === page.slug);
  if (!p) {
    console.warn('Missing product:', page.slug);
    continue;
  }
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  p.colorLabel = page.colorToken;
  console.log(page.slug, '→', gallery.map((u) => u.split('/').pop()).join(', '));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — nino-4810 gallery fix ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

console.log('Nino 4810 galleries fixed.');
