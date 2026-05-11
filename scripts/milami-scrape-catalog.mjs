/**
 * Milami.rs catalog import (filter API + listing pages).
 *
 * Milami does NOT expose product permalinks in static HTML; the grid is filled via:
 *   POST https://www.milami.rs/products/filter
 * with fields from #form_filter and page_no for pagination.
 *
 * Run:
 *   node scripts/milami-scrape-catalog.mjs
 *
 * Optional env (use MILAMI_* to avoid clashing with global MAX_LISTINGS on Windows):
 *   MILAMI_MAX_LISTINGS=80 MILAMI_MAX_PAGES_PER_LISTING=200 MILAMI_CONCURRENCY_LISTINGS=2
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const OUT_TS = path.join(ROOT, 'data', 'milami-products.generated.ts');
const OUT_RAW = path.join(ROOT, 'data', 'milami-products.raw.json');

const BASE = 'https://www.milami.rs/';
const FILTER_URL = new URL('products/filter', BASE).href;

const MAX_LISTINGS = Number(process.env.MILAMI_MAX_LISTINGS || '') || Infinity;
const MAX_PAGES_PER_LISTING = Number(process.env.MILAMI_MAX_PAGES_PER_LISTING || '') || 200;
const CONCURRENCY_LISTINGS = Math.max(1, Number(process.env.MILAMI_CONCURRENCY_LISTINGS || '') || 2);
const FETCH_TIMEOUT_MS = 30000;

const APPROX_RSD_PER_CHF = 120;

const SWISS_NAME_POOL = [
  'Alpen Komfort',
  'Matterhorn Soft',
  'Zürich Everyday',
  'Genève Comfort',
  'Lugano Warm',
  'Bern Classic',
  'Basel Relax',
  'Lausanne Air',
  'Sion Cozy',
  'St. Moritz Premium',
  'Zermatt Winter',
  'Locarno Breeze',
  'Chur Balance',
  'Thun Daily',
  'Fribourg Light',
];

/** @type {Record<string, Record<'de'|'fr'|'en'|'it', string>>} */
const SR_WORDS = {
  papuca: { de: 'Hausschuh', fr: 'Pantoufle', en: 'Slipper', it: 'Pantofola' },
  papuce: { de: 'Hausschuhe', fr: 'Pantoufles', en: 'Slippers', it: 'Pantofole' },
  zenska: { de: 'Damen', fr: 'Femme', en: 'Women', it: 'Donna' },
  muska: { de: 'Herren', fr: 'Homme', en: 'Men', it: 'Uomo' },
  decija: { de: 'Kinder', fr: 'Enfant', en: 'Kids', it: 'Bambini' },
  decije: { de: 'Kinder', fr: 'Enfant', en: 'Kids', it: 'Bambini' },
  kucna: { de: 'für Zuhause', fr: 'maison', en: 'home', it: 'casa' },
  crvena: { de: 'Rot', fr: 'Rouge', en: 'Red', it: 'Rosso' },
  crna: { de: 'Schwarz', fr: 'Noir', en: 'Black', it: 'Nero' },
  plava: { de: 'Blau', fr: 'Bleu', en: 'Blue', it: 'Blu' },
  roze: { de: 'Rosa', fr: 'Rose', en: 'Pink', it: 'Rosa' },
  pink: { de: 'Pink', fr: 'Rose', en: 'Pink', it: 'Pink' },
  ljubicasta: { de: 'Lila', fr: 'Violet', en: 'Purple', it: 'Viola' },
  zelena: { de: 'Grün', fr: 'Vert', en: 'Green', it: 'Verde' },
  siva: { de: 'Grau', fr: 'Gris', en: 'Grey', it: 'Grigio' },
  braon: { de: 'Braun', fr: 'Marron', en: 'Brown', it: 'Marrone' },
  bez: { de: 'Beige', fr: 'Beige', en: 'Beige', it: 'Beige' },
  teget: { de: 'Dunkelblau', fr: 'Bleu marine', en: 'Navy', it: 'Blu scuro' },
  medikal: { de: 'Medikal', fr: 'Medikal', en: 'Medikal', it: 'Medikal' },
};

function uniq(arr) {
  return [...new Set(arr)];
}

function abortableFetch(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(t));
}

async function fetchTextWithRetry(url, tries = 3) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await abortableFetch(url, {
        headers: {
          // Milami returns a stripped homepage to non-browser UAs (few menu links).
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 + i * 500));
    }
  }
  throw lastErr || new Error('fetch failed');
}

async function postFilter(body, referer) {
  const res = await abortableFetch(FILTER_URL, {
    method: 'POST',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      accept: 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      referer,
    },
    body,
  });
  if (!res.ok) throw new Error(`filter HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('filter response not JSON');
  }
}

function extractHrefs(html) {
  const hrefs = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) hrefs.push(m[1]);
  return hrefs;
}

function toAbsoluteUrl(href) {
  if (!href) return null;
  const h = String(href).trim();
  if (!h || h.startsWith('#') || h.startsWith('javascript:') || h.startsWith('mailto:') || h.startsWith('tel:')) return null;
  if (h.startsWith('http://') || h.startsWith('https://')) return h;
  if (h.startsWith('//')) return `https:${h}`;
  return new URL(h, BASE).href;
}

function isListingPageUrl(absUrl) {
  try {
    const u = new URL(absUrl);
    if (!u.hostname.endsWith('milami.rs')) return false;
    if (!u.pathname.startsWith('/products/')) return false;
    // typical Milami listing: /products/<segment>/0-9000 (price range)
    return /\/\d+-\d+$/.test(u.pathname);
  } catch {
    return false;
  }
}

function discoverListingUrlsFromHomepage(html) {
  const hrefs = extractHrefs(html)
    .map(toAbsoluteUrl)
    .filter(Boolean);
  return uniq(hrefs.filter(isListingPageUrl));
}

/**
 * @returns {Array<[string, string]>}
 */
function parseFormFilterParams(html) {
  const formMatch = html.match(/<form[^>]*id=["']form_filter["'][^>]*>([\s\S]*?)<\/form>/i);
  if (!formMatch) return null;
  const formHtml = formMatch[1];
  /** @type {Array<[string, string]>} */
  const pairs = [];

  const inputRe = /<input([^>]*?)>/gi;
  let m;
  while ((m = inputRe.exec(formHtml))) {
    const tag = m[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const type = (tag.match(/\btype=["']([^"']+)["']/i)?.[1] || 'text').toLowerCase();
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? '';
    if (type === 'checkbox' || type === 'radio') {
      if (/checked/i.test(tag)) pairs.push([name, value || 'on']);
    } else {
      pairs.push([name, value]);
    }
  }

  const selectRe = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  while ((m = selectRe.exec(formHtml))) {
    const name = m[1];
    const inner = m[2];
    let sel = inner.match(/<option[^>]*selected[^>]*value=["']([^"']*)["']/i);
    if (!sel) sel = inner.match(/<option[^>]*value=["']([^"']*)["'][^>]*selected/i);
    if (!sel) {
      const first = inner.match(/<option[^>]*value=["']([^"']*)["']/i);
      pairs.push([name, first?.[1] ?? '']);
    } else {
      pairs.push([name, sel[1]]);
    }
  }

  return pairs;
}

function buildFilterBody(basePairs, pageNo) {
  const sp = new URLSearchParams();
  for (const [k, v] of basePairs) sp.append(k, v);
  sp.set('page_no', String(pageNo));
  return sp.toString();
}

function inferCategory(listingUrl, title) {
  const p = listingUrl.toLowerCase();
  const tl = (title || '').toLowerCase();
  if (/(zensk|žensk)/i.test(p) || /zenska|ženska/.test(tl)) return 'women';
  if (/(mus|muš)/i.test(p) && !/devoj|bebe|dec/.test(p)) return 'men';
  if (/muska|muška|muske|muške/.test(tl) && !/dev/.test(tl)) return 'men';
  if (/(bebe|devoj|decac|decaci|deca)/i.test(p)) return 'children';
  return 'children';
}

function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ');
}

function translateTitleToLocales(title) {
  const raw = String(title || '').trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  /** @type {Record<'de'|'fr'|'en'|'it', string[]>} */
  const out = { de: [], fr: [], en: [], it: [] };
  for (const tok of tokens) {
    const key = normalizeForMatch(tok);
    const map = SR_WORDS[key];
    if (map) {
      out.de.push(map.de);
      out.fr.push(map.fr);
      out.en.push(map.en);
      out.it.push(map.it);
    } else {
      out.de.push(tok);
      out.fr.push(tok);
      out.en.push(tok);
      out.it.push(tok);
    }
  }
  return {
    de: out.de.join(' ').trim() || raw,
    fr: out.fr.join(' ').trim() || raw,
    en: out.en.join(' ').trim() || raw,
    it: out.it.join(' ').trim() || raw,
  };
}

function looksLocalName(name) {
  const lower = normalizeForMatch(name);
  return (
    /\bpapuc/.test(lower) ||
    /\bzensk/.test(lower) ||
    /\bmusk/.test(lower) ||
    /\bdecij/.test(lower) ||
    /\b(bebe|devoj|decac)/.test(lower) ||
    /\b(crvena|crna|plava|roze|ljubic|zelena|siva|braon|bez|teget)\b/.test(lower) ||
    /[čćđšž]/.test(name)
  );
}

function pickSwissName(original, usedNames) {
  const base = String(original || '').trim();
  const looksUniversal =
    !looksLocalName(base) && /^[A-Za-z0-9À-ž\s.'-]+$/.test(base) && base.length <= 40;
  if (looksUniversal) return base;

  for (const n of SWISS_NAME_POOL) {
    if (!usedNames.has(n)) return n;
  }
  let i = 2;
  while (usedNames.has(`${SWISS_NAME_POOL[0]} ${i}`)) i++;
  return `${SWISS_NAME_POOL[0]} ${i}`;
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
}

function toCHFFromRsd(n) {
  if (!Number.isFinite(n) || n <= 0) return 39.9;
  const chf = n / APPROX_RSD_PER_CHF;
  const rounded = Math.round(chf * 10) / 10;
  return Math.min(Math.max(rounded, 14.9), 199);
}

function makeDefaultSizes(category) {
  if (category === 'children') return ['20', '22', '24', '26', '28', '30', '32', '34'];
  if (category === 'men') return ['40', '41', '42', '43', '44', '45'];
  return ['36', '37', '38', '39', '40', '41', '42'];
}

function makeDefaultColors() {
  return [
    { id: 'black', label: 'Black', hex: '#111827' },
    { id: 'grey', label: 'Grey', hex: '#6b7280' },
  ];
}

function buildDescriptions(category, displayName) {
  const baseName = displayName || 'Modell';
  if (category === 'men') {
    return {
      de: `Herren-Hausschuhe „${baseName}“ – bequem, alltagstauglich und ideal für Zuhause.`,
      fr: `Pantoufles homme « ${baseName} » – confortables, pratiques et idéales à la maison.`,
      en: `Men's slippers "${baseName}" – comfortable, practical, and ideal for home.`,
      it: `Pantofole da uomo «${baseName}» – comode, pratiche e ideali per la casa.`,
    };
  }
  if (category === 'women') {
    return {
      de: `Damen-Hausschuhe „${baseName}“ – weich, bequem und ideal für Zuhause.`,
      fr: `Pantoufles femme « ${baseName} » – douces, confortables et idéales à la maison.`,
      en: `Women's slippers "${baseName}" – soft, comfy, and perfect for home.`,
      it: `Pantofole da donna «${baseName}» – morbide, comode e perfette per la casa.`,
    };
  }
  return {
    de: `Kinder-Hausschuhe „${baseName}“ – bequem und alltagstauglich, ideal für Kindergarten und Zuhause.`,
    fr: `Chaussons enfants « ${baseName} » – confortables et pratiques, idéals pour la crèche et la maison.`,
    en: `Kids' slippers "${baseName}" – comfy and practical, ideal for daycare and home.`,
    it: `Pantofole per bambini «${baseName}» – comode e pratiche, ideali per asilo e casa.`,
  };
}

function toImageUrl(imagePath) {
  if (!imagePath) return null;
  const p = String(imagePath).replace(/\\\//g, '/');
  return new URL(p, BASE).href;
}

function extractImagesFromHtml(html) {
  // Best-effort extraction for Milami product pages.
  const urls = [];

  // Common <img src="...jpg/png/webp">
  const reImg = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi;
  let m;
  while ((m = reImg.exec(html))) urls.push(m[1]);

  // data-src lazy images
  const reData = /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi;
  while ((m = reData.exec(html))) urls.push(m[1]);

  // srcset (take first url of each candidate)
  const reSrcset = /srcset=["']([^"']+)["']/gi;
  while ((m = reSrcset.exec(html))) {
    const parts = String(m[1])
      .split(',')
      .map((x) => x.trim().split(' ')[0])
      .filter(Boolean);
    urls.push(...parts);
  }

  return uniq(
    urls
      .map(toAbsoluteUrl)
      .filter(Boolean)
      .filter((u) => {
        try {
          return new URL(u).hostname.endsWith('milami.rs');
        } catch {
          return false;
        }
      })
  );
}

function inferMilamiCodeFromHtml(html) {
  // Example: "Šifra artikla: T172-6"
  const m = html.match(/Šifra\s+artikla\s*:\s*([A-Z0-9-]+)/i) || html.match(/Sifra\s+artikla\s*:\s*([A-Z0-9-]+)/i);
  return m?.[1] ? String(m[1]).trim() : null;
}

function inferMilamiBaseFromImagePath(imagePath) {
  if (!imagePath) return null;
  const base = String(imagePath).split('/').pop() || '';
  // e.g. T171-06Main.jpg -> T171-06
  const m = base.match(/^([A-Za-z0-9-]+?)(?:Main|main)?\.(jpg|jpeg|png|webp)$/i);
  return m?.[1] ? m[1] : null;
}

function keepLikelyProductImages(urls, { slug, code, baseFromMain }) {
  const s = String(slug || '').toLowerCase();
  const c = code ? String(code).toLowerCase() : '';
  const bRaw = baseFromMain ? String(baseFromMain).toLowerCase() : '';
  // Avoid overly-generic bases like "1" or "img" that would match many assets.
  const b = bRaw.length >= 5 ? bRaw : '';
  return uniq(
    urls.filter((u) => {
      const lower = u.toLowerCase();
      if (!/\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(lower)) return false;
      // Drop obvious UI assets
      if (/(logo|slogan|icon|btn-|wish-|quantity-|footer|cards|ssl|secure|unicredit|facebook|google|attributes|karakteristike)/i.test(lower)) {
        return false;
      }
      // Strong signals
      if (c && lower.includes(c)) return true;
      if (b && lower.includes(b)) return true;
      if (s && lower.includes(`/${s}`)) return true;
      // allow "product-full-gallery-0x" only if we couldn't find anything else later
      return false;
    })
  );
}

async function fetchDetailImages({ slug, mainImagePath }) {
  if (!slug) return [];
  const url = new URL(`products/single/${slug}`, BASE).href;
  try {
    const html = await fetchTextWithRetry(url, 3);
    const all = extractImagesFromHtml(html);
    const code = inferMilamiCodeFromHtml(html);
    const baseFromMain = inferMilamiBaseFromImagePath(mainImagePath);

    const primary = keepLikelyProductImages(all, { slug, code, baseFromMain });
    if (primary.length) return primary;
    // If we cannot confidently match product-specific images, return empty
    // and keep the listing "row.image" only (prevents mixing images across products).
    return [];
  } catch {
    return [];
  }
}

async function mapLimit(items, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = new Array(limit).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      ret[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return ret;
}

async function scrapeListing(listingUrl) {
  const html = await fetchTextWithRetry(listingUrl, 3);
  const basePairs = parseFormFilterParams(html);
  if (!basePairs) return { listingUrl, ok: false, error: 'missing form_filter' };

  /** @type {any[]} */
  const collected = [];
  let page = 1;
  while (page <= MAX_PAGES_PER_LISTING) {
    const body = buildFilterBody(basePairs, page);
    let data;
    try {
      data = await postFilter(body, listingUrl);
    } catch (e) {
      return { listingUrl, ok: false, error: e?.message || String(e), page, collected };
    }

    if (!data?.success) break;
    const prods = Array.isArray(data.products) ? data.products : [];
    if (!prods.length) break;
    for (const p of prods) collected.push({ listingUrl, ...p });
    if (data.hide_load_more) break;
    page++;
    await new Promise((r) => setTimeout(r, 120));
  }

  return { listingUrl, ok: true, collected };
}

async function main() {
  console.log('Fetching homepage to discover listing URLs...');
  const homeHtml = await fetchTextWithRetry(BASE, 3);
  let listings = discoverListingUrlsFromHomepage(homeHtml);
  listings = listings.slice(0, MAX_LISTINGS);
  console.log('Listing pages:', listings.length);

  const results = await mapLimit(listings, CONCURRENCY_LISTINGS, async (u) => scrapeListing(u));

  /** @type {Map<string, any>} */
  const byId = new Map();
  for (const r of results) {
    if (!r?.ok) continue;
    for (const row of r.collected) {
      const id = String(row.id || '');
      if (!id) continue;
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, row);
        continue;
      }
      // Prefer adult categories if we ever see the same SKU in kids + adult listings
      const nextCat = inferCategory(row.listingUrl, row.title);
      const prevCat = inferCategory(prev.listingUrl, prev.title);
      const rank = { children: 1, women: 2, men: 2 };
      if ((rank[nextCat] || 1) > (rank[prevCat] || 1)) byId.set(id, row);
    }
  }

  const usedNames = new Set();
  const products = [];
  const rows = Array.from(byId.values());
  const detailConcurrency = Math.max(2, Number(process.env.MILAMI_DETAIL_CONCURRENCY || '') || 6);

  /** @type {Map<string, string[]>} */
  const detailImagesBySlug = new Map();
  console.log('Fetching Milami product detail pages for galleries...');
  await mapLimit(
    rows,
    detailConcurrency,
    async (row) => {
      const slug = row.slug ? String(row.slug) : '';
      const imgs = await fetchDetailImages({ slug, mainImagePath: row.image });
      if (imgs?.length) detailImagesBySlug.set(slug, imgs);
    }
  );

  for (const row of rows) {
    const pid = String(row.id || '');
    const category = inferCategory(row.listingUrl, row.title);
    const title = String(row.title || 'Milami').trim();
    const swissName = pickSwissName(title, usedNames);
    usedNames.add(swissName);

    const namesFromSr = translateTitleToLocales(title);
    const name = {
      de: looksLocalName(title) ? swissName : namesFromSr.de,
      fr: looksLocalName(title) ? swissName : namesFromSr.fr,
      en: looksLocalName(title) ? swissName : namesFromSr.en,
      it: looksLocalName(title) ? swissName : namesFromSr.it,
    };
    // If we replaced with Swiss pool name, keep consistent across locales (Swiss-facing catalog)
    if (swissName !== title && SWISS_NAME_POOL.includes(swissName)) {
      name.de = swissName;
      name.fr = swissName;
      name.en = swissName;
      name.it = swissName;
    }

    const slugBase = row.slug ? String(row.slug) : slugify(swissName);
    const slug = slugify(`milami-${slugBase}`);

    const priceRsd = Number(String(row.price || '').replace(/\./g, '').replace(',', '.'));
    const priceCHF = toCHFFromRsd(priceRsd);

    const img = toImageUrl(row.image);
    const detailImgs = row.slug ? (detailImagesBySlug.get(String(row.slug)) || []) : [];
    const images = uniq([img, ...detailImgs].filter(Boolean));

    const sizes = makeDefaultSizes(category);
    const colors = makeDefaultColors();
    const variants = sizes.flatMap((size) =>
      colors.map((c) => ({
        size,
        color: c.id,
        sku: `MILAMI-${pid}-${size}-${c.id}`,
        priceCHF,
        stock: 10,
      }))
    );

    products.push({
      id: `milami-${pid}`,
      slug,
      category,
      brand: 'milami',
      name,
      description: buildDescriptions(category, name.en),
      image: img || 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80',
      images: images.length ? images : undefined,
      sizes: sizes.map((s) => ({ id: s, label: { de: s, fr: s, en: s, it: s } })),
      colors,
      variants,
    });
  }

  products.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(
    OUT_RAW,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        listings: listings.length,
        uniqueProducts: products.length,
        results,
      },
      null,
      2
    ),
    'utf8'
  );

  const ts =
    `/* AUTO-GENERATED by scripts/milami-scrape-catalog.mjs */\n` +
    `// No type import here (generated file).\n` +
    `export const milamiProducts = ${JSON.stringify(products, null, 2)};\n`;

  fs.writeFileSync(OUT_TS, ts, 'utf8');

  console.log('Done. Unique products:', products.length);
  console.log('Wrote:', OUT_TS);
  console.log('Wrote:', OUT_RAW);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
