/**
 * Import missing Excel models from leon.rs (found via leon-search-missing.py).
 * Groups colour variants, applies Excel maloprodajna CHF price.
 *
 * Run: node scripts/leon-import-missing.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { leonDefaultSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(process.cwd());
const REPORT_PATH = path.join(ROOT, 'scripts', 'leon-import-missing-report.json');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const OUT_RAW_APPEND = path.join(ROOT, 'data', 'leon-missing-import.raw.json');

const FETCH_TIMEOUT_MS = 25000;
const CONCURRENCY = 4;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function decodeHtml(s) {
  return s
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

function cleanTitle(raw) {
  return decodeHtml(raw)
    .replace(/\s*[|–—]\s*Leon\s*$/i, '')
    .replace(/\s+Leon\s*$/i, '')
    .trim();
}

function abortableFetch(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(t));
}

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore */
    }
  }
  return out;
}

function extractMetaContent(html, propertyOrName) {
  const esc = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  return html.match(re)?.[1]?.trim() || null;
}

function extractBreadcrumbUrlsFromJsonLd(ldList) {
  const urls = [];
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === 'BreadcrumbList' && Array.isArray(obj.itemListElement)) {
      for (const it of obj.itemListElement) {
        const item = it?.item;
        const u = item?.['@id'] || item?.url || (typeof item === 'string' ? item : null);
        if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
      }
    }
    for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
      if (typeof v === 'object') walk(v);
    }
  };
  for (const x of ldList) walk(x);
  return [...new Set(urls)];
}

function inferGender(crumbsLower) {
  if (crumbsLower.includes('/decije-') || crumbsLower.includes('decije')) return 'children';
  if (crumbsLower.includes('/muske-') || crumbsLower.includes('muske')) return 'men';
  return 'women';
}

function modelBaseFromUrl(url) {
  const m = url.match(/\/p\/([^/]+)\//);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  const parts = slug.split('-').filter(Boolean);
  if (!parts.length) return slug;
  return parts[0];
}

function modelBaseFromNaziv(naziv) {
  return slugify(naziv.replace(/\*/g, '').split(/\s+\d/)[0].trim());
}

async function searchProductUrls(query) {
  const url = `https://leon.rs/?s=${encodeURIComponent(query)}&post_type=product`;
  const res = await abortableFetch(url, {
    headers: { 'user-agent': 'TrendSwissShopBot/0.1', accept: 'text/html' },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const links = [...html.matchAll(/href="(https:\/\/leon\.rs\/p\/[^"]+)"/g)].map((m) => m[1]);
  return [...new Set(links)];
}

async function scrapeProductPage(url) {
  const res = await abortableFetch(url, {
    headers: { 'user-agent': 'TrendSwissShopBot/0.1', accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const ld = extractJsonLd(html);
  const crumbs = extractBreadcrumbUrlsFromJsonLd(ld);
  const crumbsLower = crumbs.join(' ').toLowerCase();

  let name =
    ld.flatMap((x) => (Array.isArray(x) ? x : [x])).find((x) => x?.['@type'] === 'Product')?.name ||
    extractMetaContent(html, 'og:title');
  if (!name) {
    const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    name = t || 'Leon Model';
  }

  const images = [
    ...[...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
      (m) => m[0]
    ),
    ...(extractMetaContent(html, 'og:image') ? [extractMetaContent(html, 'og:image')] : []),
  ].filter(Boolean);
  const uniqImages = [...new Set(images)];

  const genderCategory = inferGender(crumbsLower);
  const pathSlug = url.match(/\/p\/([^/]+)\//)?.[1] || slugify(name);

  return {
    url,
    name: cleanTitle(String(name)),
    images: uniqImages,
    genderCategory,
    pathSlug,
    crumbs,
  };
}

function makeDefaultColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
}

function toProduct({ displayName, slug, images, priceCHF, genderCategory, modelGroupId, crumbs }) {
  const sizes = leonDefaultSizes(genderCategory, { crumbs, genderCategory });
  const colors = makeDefaultColors();
  const skuBase = slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const variants = sizes.flatMap((size) =>
    colors.map((c) => ({
      size,
      color: c.id,
      sku: `LEON-${skuBase}-${size}-${c.id}`,
      priceCHF,
      stock: 10,
    }))
  );
  const img = images?.[0] || 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80';
  const desc = {
    de: `Modell „${displayName}“ mit anatomischem Fussbett.`,
    fr: `Modèle « ${displayName} » avec assise plantaire anatomique.`,
    en: `Model "${displayName}" with an anatomical footbed.`,
    it: `Modello «${displayName}» con plantare anatomico.`,
  };

  return {
    id: `leon-${slug}`,
    slug,
    category: genderCategory,
    brand: 'leon',
    ...(modelGroupId ? { modelGroupId } : {}),
    name: { de: displayName, fr: displayName, en: displayName, it: displayName },
    description: desc,
    image: img,
    images: images?.length ? images : undefined,
    sizes: sizes.map((s) => ({ id: s, label: { de: s, fr: s, en: s, it: s } })),
    colors,
    variants,
  };
}

function loadExistingLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts from generated file');
  return JSON.parse(m[1]);
}

async function mapLimit(items, limit, fn) {
  const ret = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        ret[idx] = await fn(items[idx], idx);
      }
    })
  );
  return ret;
}

async function main() {
  const report = readJson(REPORT_PATH);
  const existing = loadExistingLeonProducts();
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const existingIds = new Set(existing.map((p) => p.id));

  const toImport = report.filter((r) => r.verified?.url);
  const importLog = [];
  const newProducts = [];
  const newRaw = [];

  for (const entry of toImport) {
    const excel = entry.excel;
    const priceCHF = excel.maloprodajnaCHF;
    const naziv = excel.naziv.replace(/\*/g, '').trim();
    const broj = excel.broj;
    const verifiedUrl = entry.verified.url;
    const base = modelBaseFromUrl(verifiedUrl) || modelBaseFromNaziv(naziv);
    const modelGroupId = `leon-mg-${slugify(`${base}-${broj}`)}`;

    console.log(`Importing ${naziv} (${broj}) base=${base}...`);

    let candidateUrls = [];
    try {
      const q1 = await searchProductUrls(naziv.split(/\s+/)[0]);
      const q2 = await searchProductUrls(base);
      candidateUrls = [...new Set([verifiedUrl, ...q1, ...q2])].filter((u) => {
        const b = modelBaseFromUrl(u);
        return b === base || u.toLowerCase().includes(base);
      });
    } catch (e) {
      candidateUrls = [verifiedUrl];
    }

    const scraped = [];
    for (const url of candidateUrls.slice(0, 12)) {
      try {
        const row = await scrapeProductPage(url);
        scraped.push(row);
      } catch (e) {
        importLog.push({ naziv, broj, url, error: e?.message || String(e) });
      }
    }

    if (!scraped.length) {
      importLog.push({ naziv, broj, status: 'no_pages_scraped' });
      continue;
    }

    const uniqBySlug = new Map();
    for (const row of scraped) {
      const slug = row.pathSlug;
      if (existingSlugs.has(slug) || uniqBySlug.has(slug)) continue;
      uniqBySlug.set(slug, row);
    }

    let added = 0;
    for (const row of uniqBySlug.values()) {
      const product = toProduct({
        displayName: row.name,
        slug: row.pathSlug,
        images: row.images,
        priceCHF,
        genderCategory: row.genderCategory,
        modelGroupId,
        crumbs: row.crumbs,
      });
      if (existingIds.has(product.id)) continue;
      newProducts.push(product);
      newRaw.push({ ...row, excelBroj: broj, excelNaziv: naziv, priceCHF });
      existingSlugs.add(product.slug);
      existingIds.add(product.id);
      added++;
    }

    importLog.push({
      naziv,
      broj,
      status: 'imported',
      colors: added,
      modelGroupId,
      urls: [...uniqBySlug.keys()],
    });
    console.log(`  +${added} colour rows`);
  }

  const merged = [...existing, ...newProducts];
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED by scripts/leon-scrape-explore.mjs + leon-import-missing.mjs */\n` +
      `// No type import here (generated file).\n` +
      `export const leonProducts = ${JSON.stringify(merged, null, 2)};\n`,
    'utf8'
  );

  fs.writeFileSync(
    OUT_RAW_APPEND,
    JSON.stringify({ importedAt: new Date().toISOString(), newRaw, importLog }, null, 2),
    'utf8'
  );

  const notFound = report.filter((r) => !r.verified?.url);
  console.log('\n=== SUMMARY ===');
  console.log('New products added:', newProducts.length);
  console.log('Total leon products:', merged.length);
  console.log('Not found on leon.rs:', notFound.length);
  for (const x of notFound) {
    console.log(' -', x.excel.naziv, x.excel.broj);
  }
  console.log('Log:', OUT_RAW_APPEND);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
