/**
 * Olaf (4800): fix galleries — only images for matching colour (Olaf-TEGET / Olaf-PERLA).
 * npx tsx scripts/patch-olaf-4800-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const OLAF_PAGES = [
  { slug: 'olaf-teget', url: 'https://leon.rs/p/olaf-teget/', colorToken: 'TEGET' },
  { slug: 'olaf-perla', url: 'https://leon.rs/p/olaf-perla/', colorToken: 'PERLA' },
];

function extractOlafGalleryFromHtml(html, colorToken) {
  const esc = colorToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `https://cdn\\.leon\\.rs/wp-content/uploads/[^"'\\s>]+/Olaf-${esc}(?:-(\\d+))?\\.(?:jpg|jpeg|png|webp)`,
    'gi'
  );
  const byIndex = new Map();
  for (const m of html.matchAll(re)) {
    const idx = m[1] ? Number(m[1]) : 0;
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
  const filtered = extractOlafGalleryFromHtml(html, colorToken);
  if (!filtered.length) throw new Error(`No Olaf-${colorToken} images on ${url}`);
  return filtered;
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

const products = loadProducts();

for (const page of OLAF_PAGES) {
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
  `/* AUTO-GENERATED — olaf-4800 gallery fix ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

console.log('Olaf 4800 galleries fixed.');
