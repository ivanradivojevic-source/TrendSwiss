/**
 * Fetch Šifra artikla (SKU) from leon.rs for every catalogue row and fix articleNumber / colorLabel.
 * Also re-normalizes modelGroupId + names from LEON URLs (not image filename guesses).
 *
 * npx tsx scripts/sync-leon-skus-from-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const FETCH_TIMEOUT_MS = 25000;
const CONCURRENCY = 5;
const DELAY_MS = 280;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function extractSifra(html) {
  const patterns = [
    /class=["']sku-value["'][^>]*>\s*([A-Z0-9][A-Z0-9-]*)\s*</i,
    /SKU\s*:\s*<\/span>\s*<span[^>]*>\s*([A-Z0-9][A-Z0-9-]*)\s*</i,
    /Šifra\s+artikla\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
    /Sifra\s+artikla\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
    /SKU\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
    /"sku"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function decodeHtml(s) {
  return s
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function cleanLeonTitle(raw) {
  return decodeHtml(raw)
    .replace(/\s*[|–—]\s*Leon\s*$/i, '')
    .replace(/\s+Leon\s*$/i, '')
    .trim();
}

function colorLabelFromTitle(title) {
  const parts = title.split(/\s*[–—]\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
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

function cleanProductImages(p) {
  const stem = primaryStem(p.image);
  if (!stem || !Array.isArray(p.images)) return;
  const kept = [p.image];
  for (const img of p.images) {
    if (img === p.image) continue;
    if (!imageBelongsToStem(img, stem)) continue;
    if (/favicon|logo\.png/i.test(img)) continue;
    if (!kept.includes(img)) kept.push(img);
  }
  p.images = kept.length > 1 ? kept : undefined;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'TrendSwissShopBot/1.0', accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function scrapeLeonPage(url) {
  const html = await fetchHtml(url);
  const sifra = extractSifra(html);
  let title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  title = title ? cleanLeonTitle(title) : null;
  const colorLabel = title ? colorLabelFromTitle(title) : null;
  return { url, sifra, title, colorLabel };
}

function collectUrlBySlug(products) {
  const bySlug = new Map();
  const rawFiles = [
    path.join(ROOT, 'data', 'leon-products.raw.json'),
    path.join(ROOT, 'data', 'leon-missing-import.raw.json'),
  ];
  for (const fp of rawFiles) {
    if (!fs.existsSync(fp)) continue;
    const data = readJson(fp);
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data.raw)
        ? data.raw
        : Array.isArray(data.newRaw)
          ? data.newRaw
          : [];
    for (const r of rows) {
      if (!r?.url || !r?.images?.[0]) continue;
      const slug = r.url.match(/\/p\/([^/]+)\/?$/i)?.[1]?.toLowerCase();
      if (slug) bySlug.set(slug, r.url);
    }
  }
  for (const p of products) {
    if (!bySlug.has(p.slug)) {
      bySlug.set(p.slug, `https://leon.rs/p/${p.slug}/`);
    }
  }
  return bySlug;
}

async function mapLimit(entries, limit, fn) {
  const out = new Map();
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= entries.length) return;
        const [slug, url] = entries[idx];
        try {
          const info = await fn(slug, url);
          out.set(slug, info);
        } catch (e) {
          out.set(slug, { url, error: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
      }
    })
  );
  return out;
}

async function main() {
  const products = loadLeonProducts();
  const urlBySlug = collectUrlBySlug(products);
  const entries = [...urlBySlug.entries()];

  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = readJson(CACHE_PATH);
    } catch {
      cache = {};
    }
  }

  const toFetch = entries.filter(([slug]) => !cache[slug]?.sifra);
  console.log(`Leon rows: ${products.length}, URLs: ${entries.length}, to fetch: ${toFetch.length}`);

  if (toFetch.length) {
    const scraped = await mapLimit(toFetch, CONCURRENCY, async (slug, url) => {
      console.log(`  ${slug}`);
      return scrapeLeonPage(url);
    });
    for (const [slug, info] of scraped) {
      cache[slug] = { ...cache[slug], ...info, fetchedAt: new Date().toISOString() };
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  }

  let updated = 0;
  let missing = 0;
  const report = [];

  for (const p of products) {
    const info = cache[p.slug];
    cleanProductImages(p);

    if (info?.sifra) {
      const prev = p.articleNumber;
      p.articleNumber = info.sifra;
      if (prev !== info.sifra) updated++;
    } else {
      delete p.articleNumber;
      missing++;
      report.push({ slug: p.slug, issue: info?.error || 'no_sifra_on_page' });
    }

    if (info?.colorLabel) {
      p.colorLabel = info.colorLabel;
    } else if (info?.title) {
      const c = colorLabelFromTitle(info.title);
      if (c) p.colorLabel = c;
    } else if (p.name?.en?.includes(' – ')) {
      const c = colorLabelFromTitle(p.name.en);
      if (c) p.colorLabel = c;
    } else {
      delete p.colorLabel;
    }
  }

  // Re-normalize names + modelGroupId from LEON URLs
  const { normalizeLeonImportedProducts } = await import('../data/leonCatalogNormalize.ts');
  const normalized = normalizeLeonImportedProducts(products);

  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — SKUs synced from leon.rs ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(normalized, null, 2)};\n`,
    'utf8'
  );

  const reportPath = path.join(ROOT, 'scripts', 'leon-sku-sync-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ updated, missing, failures: report.slice(0, 200) }, null, 2),
    'utf8'
  );

  console.log(`articleNumber updated: ${updated}`);
  console.log(`missing sifra: ${missing}`);
  console.log(`report: ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
