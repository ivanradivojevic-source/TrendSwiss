/**
 * Kratos (4703M): gallery 4 images per colour from leon.rs.
 * npx tsx scripts/patch-kratos-4703m-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const PAGES = [
  {
    slug: 'kratos-siva-velur',
    url: 'https://leon.rs/p/kratos-siva-velur/',
    colorLabel: 'Siva velur',
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Kratos-SIVA-VELUR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'kratos-crna',
    url: 'https://leon.rs/p/kratos-crna/',
    colorLabel: 'Crna',
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/4703M-Crna(\d+)\.(?:jpg|jpeg|png|webp)/gi,
  },
  {
    slug: 'kratos-braon-velur',
    url: 'https://leon.rs/p/kratos-braon-velur/',
    colorLabel: 'Braon velur',
    galleryRe:
      /https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\\s>]+\/Kratos-BRAON-VELUR(?:-(\d+))?\.(?:jpg|jpeg|png|webp)/gi,
  },
];

function extractGallery(html, re) {
  const byIndex = new Map();
  for (const m of html.matchAll(re)) {
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

for (const page of PAGES) {
  const res = await fetch(page.url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${page.url}`);
  const html = await res.text();
  const gallery = extractGallery(html, page.galleryRe);
  if (!gallery.length) throw new Error(`No gallery for ${page.slug}`);

  const p = products.find((x) => x.slug === page.slug);
  if (!p) {
    console.warn('Missing', page.slug);
    continue;
  }
  p.image = gallery[0];
  p.images = gallery.length > 1 ? gallery : undefined;
  p.colorLabel = page.colorLabel;
  console.log(page.slug, '→', gallery.map((u) => u.split('/').pop()).join(', '));
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — kratos-4703m gallery ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

console.log('Kratos 4703M galleries updated.');
