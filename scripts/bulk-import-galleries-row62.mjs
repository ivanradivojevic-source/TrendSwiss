/**
 * Od Excel reda 62 (art. 5001+) — za sve varijante sa ≤1 slikom uvezi galeriju sa leon.rs.
 * npx tsx scripts/bulk-import-galleries-row62.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const REPORT_PATH = path.join(ROOT, 'scripts', 'bulk-galleries-row62-report.json');
const RAW_JSON = path.join(ROOT, 'data', 'leon-products.raw.json');
const EXCEL = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;
const PY = path.join(ROOT, 'scripts', 'read-excel-prices.py');

const FETCH_TIMEOUT_MS = 25000;
const CONCURRENCY = 4;
const DELAY_MS = 300;
const MIN_ROW = 62;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function imageCount(p) {
  const imgs = p.images?.length ? p.images : p.image ? [p.image] : [];
  return new Set(imgs.filter(Boolean)).size;
}

function primaryStem(url) {
  const m = url?.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)/i);
  return m?.[1]?.toLowerCase() ?? null;
}

function imageBelongsToStem(imgUrl, stem) {
  if (!stem) return false;
  const s = primaryStem(imgUrl);
  if (!s) return false;
  if (s === stem) return true;
  if (s.startsWith(`${stem}-`)) return true;
  return false;
}

function extractFancyboxGallery(html) {
  const urls = [];
  for (const re of [
    /href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*data-fancybox=["']product-gallery/gi,
    /data-fancybox=["']product-gallery["'][^>]*href=["'](https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi,
    /href=["'](https?:\/\/(?:cdn\.)?leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*data-fancybox=["']product-gallery/gi,
    /data-fancybox=["']product-gallery["'][^>]*href=["'](https?:\/\/(?:cdn\.)?leon\.rs\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi,
  ]) {
    for (const m of html.matchAll(re)) {
      const u = m[1]?.replace(/^http:\/\//i, 'https://');
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}

function filterGalleryByPrimary(primaryUrl, urls) {
  const stem = primaryStem(primaryUrl);
  if (!stem) return urls.slice(0, 12);
  const kept = urls.filter((u) => imageBelongsToStem(u, stem));
  const out = [primaryUrl];
  for (const u of kept) {
    if (u !== primaryUrl && !out.includes(u)) out.push(u);
  }
  return out;
}

function fallbackFromHtml(html, primaryUrl) {
  const all = [
    ...new Set(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0]
      )
    ),
  ].filter((u) => !/favicon|logo\.png|placeholder/i.test(u));
  const primary = primaryUrl && all.includes(primaryUrl) ? primaryUrl : all.find((u) => /-1\.|1\.jpg/i.test(u)) || all[0];
  if (!primary) return [];
  return filterGalleryByPrimary(primary, all);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function scrapeGallery(url, existingImage) {
  const html = await fetchHtml(url);
  let gallery = extractFancyboxGallery(html);
  if (gallery.length <= 1) {
    gallery = fallbackFromHtml(html, existingImage || gallery[0]);
  }
  if (existingImage && gallery.length && !gallery.includes(existingImage)) {
    gallery = filterGalleryByPrimary(existingImage, [existingImage, ...gallery]);
  }
  return gallery.filter((u) => !/favicon|logo\.png/i.test(u));
}

function loadRawBySlug() {
  if (!fs.existsSync(RAW_JSON)) return new Map();
  const data = JSON.parse(fs.readFileSync(RAW_JSON, 'utf8'));
  const rows = Array.isArray(data) ? data : data.raw ?? [];
  const map = new Map();
  for (const r of rows) {
    const slug = r.url?.match(/\/p\/([^/]+)\/?$/i)?.[1]?.toLowerCase();
    if (slug && r.images?.length > 1) map.set(slug, r.images);
  }
  return map;
}

function excelBrojeviFromRow60() {
  const raw = execSync(`python "${PY}" "${EXCEL}"`, { encoding: 'utf8' });
  const rows = JSON.parse(raw);
  return new Set(rows.filter((r) => r.sheetRow >= MIN_ROW).map((r) => String(r.broj).trim()));
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await fn(items[idx], idx);
        await sleep(DELAY_MS);
      }
    })
  );
  return results;
}

const brojevi = excelBrojeviFromRow60();
const products = loadProducts();
const targets = products.filter((p) => {
  const broj = String(p.articleNumber ?? '').trim();
  if (!brojevi.has(broj)) return false;
  return imageCount(p) <= 1;
});

console.log(`Excel row >= ${MIN_ROW}: ${brojevi.size} article numbers`);
console.log(`Single-image variants to patch: ${targets.length}`);

const report = { patched: [], skipped: [], failed: [] };
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const rawBySlug = loadRawBySlug();

const results = await mapLimit(targets, CONCURRENCY, async (p) => {
  const url = cache[p.slug]?.url || `https://leon.rs/p/${p.slug}/`;
  try {
    let gallery = [];
    try {
      gallery = await scrapeGallery(url, p.image);
    } catch (e) {
      const fromRaw = rawBySlug.get(p.slug);
      if (fromRaw?.length > 1) {
        gallery = fromRaw;
        console.warn(p.slug, 'leon.rs unavailable — raw archive', gallery.length);
      } else throw e;
    }
    if (gallery.length <= 1) {
      const fromRaw = rawBySlug.get(p.slug);
      if (fromRaw?.length > 1) gallery = fromRaw;
    }
    if (gallery.length <= 1) {
      report.skipped.push({ slug: p.slug, broj: p.articleNumber, reason: 'only_one_found', url });
      return null;
    }
    p.image = gallery[0];
    p.images = gallery;
    report.patched.push({
      slug: p.slug,
      broj: p.articleNumber,
      count: gallery.length,
      files: gallery.map((u) => u.split('/').pop()),
    });
    if (!cache[p.slug]) cache[p.slug] = {};
    cache[p.slug].url = url;
    cache[p.slug].fetchedAt = new Date().toISOString();
    console.log('OK', p.slug, gallery.length);
    return p.slug;
  } catch (e) {
    report.failed.push({ slug: p.slug, broj: p.articleNumber, url, error: e?.message || String(e) });
    console.warn('FAIL', p.slug, e?.message);
    return null;
  }
});

const ok = results.filter(Boolean).length;
fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — bulk-galleries-row62 ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(`Done: ${ok} patched, ${report.skipped.length} skipped, ${report.failed.length} failed`);
