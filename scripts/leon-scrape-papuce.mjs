/**
 * Leon.rs papuče scraper (WooCommerce sitemap based).
 *
 * - Reads Leon product sitemap and downloads product pages
 * - Keeps only products that belong to papuče categories
 * - Extracts name, images, price (best-effort via JSON-LD / meta tags)
 * - Generates:
 *    - data/leon-products.generated.ts  (Product[] compatible with this project)
 *    - data/leon-products.raw.json      (debug/raw extracted fields)
 *
 * Run:
 *   node scripts/leon-scrape-papuce.mjs
 *
 * Notes:
 * - Best-effort scraping; you should review the generated file.
 * - We rename some “local/serial” names to Swiss-style names via heuristic.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const SITEMAP_PRODUCTS_PATH = path.join(ROOT, 'scripts', '_leon_sitemaps', 'sitemap-post-type-product.xml');
const SITEMAP_CATS_PATH = path.join(ROOT, 'scripts', '_leon_sitemaps', 'sitemap-taxonomy-product_cat.xml');

const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const OUT_RAW = path.join(ROOT, 'data', 'leon-products.raw.json');

const MAX_PRODUCTS = Infinity; // set e.g. 50 for quick test
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 25000;

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
];

function readFileText(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractLocsFromSitemap(xml) {
  const locs = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) {
    locs.push(m[1].trim());
  }
  return locs;
}

function uniq(arr) {
  return [...new Set(arr)];
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

function pickSwissName(original, usedNames) {
  // Keep names that feel “universal” (no obvious Serbian words like papuča + numbers/colors)
  const lower = original.toLowerCase();
  const looksLocal =
    /\bpapu(c|č)a\b/i.test(original) ||
    /\bku(c|ć)na\b/i.test(original) ||
    /\bzenske\b|\bmuske\b|\bdecije\b/i.test(lower) ||
    /\b(roze|crna|bela|bijela|plava|zelena|siva|braon|bež|bez)\b/i.test(lower) ||
    /\b\d{2,}\b/.test(original);

  const looksUniversal = !looksLocal && /^[A-Za-zÀ-ž0-9\s.'-]+$/.test(original) && original.length <= 32;
  if (looksUniversal) return original;

  for (const base of SWISS_NAME_POOL) {
    if (!usedNames.has(base)) return base;
  }
  // fallback with suffix
  let i = 2;
  while (usedNames.has(`${SWISS_NAME_POOL[0]} ${i}`)) i++;
  return `${SWISS_NAME_POOL[0]} ${i}`;
}

function abortableFetch(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(t));
}

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      out.push(parsed);
    } catch {
      // some pages include multiple JSON objects or invalid JSON; ignore
    }
  }
  return out;
}

function extractBreadcrumbUrlsFromJsonLd(ldList) {
  const urls = [];
  const pushUrl = (u) => {
    if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
  };
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === 'BreadcrumbList') {
      const items = obj.itemListElement;
      if (Array.isArray(items)) {
        for (const it of items) {
          const item = it?.item;
          pushUrl(item?.['@id']);
          pushUrl(item?.url);
          pushUrl(typeof item === 'string' ? item : null);
        }
      }
    }
    for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
      if (typeof v === 'object') walk(v);
    }
  };
  for (const x of ldList) walk(x);
  return uniq(urls);
}

function extractMetaContent(html, propertyOrName) {
  // og:image / name=description etc
  const esc = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^\"']+)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m?.[1]?.trim() || null;
}

function looksLikePapuce(html, url) {
  // quick URL hint
  if (url.includes('/p/kucna-papuca') || url.includes('papuca')) return true;
  // JSON-LD breadcrumbs contain real category path for THIS product
  const ld = extractJsonLd(html);
  const crumbs = extractBreadcrumbUrlsFromJsonLd(ld).join(' ').toLowerCase();
  if (crumbs.includes('/c/papuce')) return true;
  return false;
}

function inferCategory(html) {
  const ld = extractJsonLd(html);
  const crumbs = extractBreadcrumbUrlsFromJsonLd(ld).join(' ').toLowerCase();
  if (crumbs.includes('/c/papuce/decije-papuce')) return 'children';
  if (crumbs.includes('/c/papuce/muske-papuce')) return 'men';
  if (crumbs.includes('/c/papuce/zenske-papuce')) return 'women';
  // default
  return 'women';
}

function inferPriceFromJsonLd(ldList) {
  // Try Product schema offers.price
  const candidates = [];
  const collect = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === 'Product' || obj['@type']?.includes?.('Product')) {
      candidates.push(obj);
    }
    for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
      if (typeof v === 'object') collect(v);
    }
  };
  collect(ldList);

  for (const p of candidates) {
    const offers = p.offers;
    const first = Array.isArray(offers) ? offers[0] : offers;
    const price = first?.price ?? first?.lowPrice ?? null;
    const currency = first?.priceCurrency ?? null;
    if (price != null) return { price: Number(price), currency };
  }
  return null;
}

function inferPriceFromHtml(html) {
  // WooCommerce often embeds price in meta or visible markup.
  const patterns = [
    /property=["']product:price:amount["']\s+content=["']([\d.,]+)["']/i,
    /itemprop=["']price["']\s+content=["']([\d.,]+)["']/i,
    /"price"\s*:\s*"([\d.,]+)"/i,
    /class=["'][^"']*amount[^"']*["'][^>]*>\s*([\d.,]+)\s*</i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function extractImagesFromJsonLd(ldList) {
  const imgs = [];
  const collect = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === 'Product' || obj['@type']?.includes?.('Product')) {
      const image = obj.image;
      if (typeof image === 'string') imgs.push(image);
      if (Array.isArray(image)) imgs.push(...image.filter((x) => typeof x === 'string'));
    }
    for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
      if (typeof v === 'object') collect(v);
    }
  };
  collect(ldList);
  return uniq(imgs);
}

function makeDefaultSizes(category) {
  if (category === 'children') {
    return ['26', '28', '30', '32', '34'];
  }
  if (category === 'men') {
    return ['40', '41', '42', '43', '44'];
  }
  // Women's papuče on leon.rs: 36–41 (no 42)
  return ['36', '37', '38', '39', '40', '41'];
}

function makeDefaultColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
  ];
}

function buildDescriptions(category, swissName, originalName) {
  const baseName = swissName || originalName || 'Modell';
  if (category === 'men') {
    return {
      de: `Herrenhausschuhe „${baseName}“ mit bequemem, anatomischem Fussbett – ideal für Zuhause.`,
      fr: `Pantoufles homme « ${baseName} » avec semelle intérieure anatomique confortable – idéales à la maison.`,
      en: `Men's slippers "${baseName}" with a comfortable anatomical footbed – ideal for home.`,
      it: `Pantofole da uomo «${baseName}» con plantare anatomico confortevole – ideali per la casa.`,
    };
  }
  if (category === 'children') {
    return {
      de: `Kinderhausschuhe „${baseName}“ mit rutschfester Sohle – bequem und sicher für Zuhause.`,
      fr: `Pantoufles enfants « ${baseName} » avec semelle antidérapante – confortables et sûres à la maison.`,
      en: `Kids' slippers "${baseName}" with a non-slip sole – comfy and safe at home.`,
      it: `Pantofole per bambini «${baseName}» con suola antiscivolo – comode e sicure a casa.`,
    };
  }
  // women / default
  return {
    de: `Damenhausschuhe „${baseName}“ mit weichem, anatomischem Fussbett – ideal für gemütliche Stunden Zuhause.`,
    fr: `Pantoufles femme « ${baseName} » avec semelle intérieure anatomique douce – idéales pour des moments cosy à la maison.`,
    en: `Women's slippers "${baseName}" with a soft anatomical footbed – perfect for cosy moments at home.`,
    it: `Pantofole da donna «${baseName}» con plantare anatomico morbido – perfette per momenti di relax a casa.`,
  };
}

function toProduct({ url, name, description, images, priceCHF, category, swissName }) {
  const slug = slugify(swissName);
  const sizes = makeDefaultSizes(category);
  const colors = makeDefaultColors();
  const variants = sizes.flatMap((size) =>
    colors.map((c) => ({
      size,
      color: c.id,
      sku: `LEON-${slug.toUpperCase().slice(0, 18)}-${size}-${c.id}`,
      priceCHF,
      stock: 10,
    }))
  );

  const img = images?.[0] || null;
  const desc = buildDescriptions(category, swissName, name);

  return {
    id: `leon-${slug}`,
    slug,
    category,
    brand: 'leon',
    name: { de: swissName, fr: swissName, en: swissName, it: swissName },
    description: desc,
    image: img || 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80',
    images: images?.length ? images : undefined,
    sizes: sizes.map((s) => ({ id: s, label: { de: s, fr: s, en: s } })),
    colors,
    variants,
    // extra debug fields are not allowed in Product; keep in raw json only
  };
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

async function main() {
  if (!fs.existsSync(SITEMAP_PRODUCTS_PATH)) {
    throw new Error(`Missing ${SITEMAP_PRODUCTS_PATH}. First download sitemaps.`);
  }
  if (!fs.existsSync(SITEMAP_CATS_PATH)) {
    throw new Error(`Missing ${SITEMAP_CATS_PATH}. First download sitemaps.`);
  }

  const productSitemap = readFileText(SITEMAP_PRODUCTS_PATH);
  const catSitemap = readFileText(SITEMAP_CATS_PATH);

  const productUrls = extractLocsFromSitemap(productSitemap)
    .filter((u) => u.includes('/p/'));

  const papuceCatUrls = extractLocsFromSitemap(catSitemap).filter((u) => u.includes('/c/papuce'));

  console.log('Found product URLs:', productUrls.length);
  console.log('Found papuče category URLs:', papuceCatUrls.length);

  const urls = productUrls.slice(0, MAX_PRODUCTS);
  const usedNames = new Set();

  const raw = await mapLimit(urls, CONCURRENCY, async (url, idx) => {
    try {
      const res = await abortableFetch(url, {
        headers: {
          'user-agent': 'TrendSwissShopBot/0.1 (catalog import)',
          'accept': 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) return { url, ok: false, status: res.status };
      const html = await res.text();

      // keep only papuče
      const isPapuce = looksLikePapuce(html, url);
      if (!isPapuce) return { url, ok: true, isPapuce: false };

      const ld = extractJsonLd(html);

      // name
      let name =
        ld
          .flatMap((x) => (Array.isArray(x) ? x : [x]))
          .find((x) => x && typeof x === 'object' && (x['@type'] === 'Product'))?.name ||
        extractMetaContent(html, 'og:title') ||
        null;

      if (typeof name !== 'string' || !name.trim()) {
        // title tag fallback
        const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
        name = t ? t.replace(/\s*\|\s*Leon.*$/i, '').trim() : null;
      }

      const images = uniq([
        ...extractImagesFromJsonLd(ld),
        ...(extractMetaContent(html, 'og:image') ? [extractMetaContent(html, 'og:image')] : []),
      ].filter(Boolean));

      const priceInfo = inferPriceFromJsonLd(ld);
      let price = priceInfo?.price ?? null;
      // fallback: try to find “RSD” price and convert roughly if needed (but we want CHF)
      if (!Number.isFinite(price) || price <= 0) {
        const fromHtml = inferPriceFromHtml(html);
        price = fromHtml ?? 49.9;
      }
      // Leon site is RSD; for Swiss shop we keep placeholder CHF unless we have explicit CHF pricing.
      if (priceInfo?.currency && String(priceInfo.currency).toLowerCase() !== 'chf') {
        price = 49.9;
      }
      if (!priceInfo?.currency && Number(price) > 500) {
        price = 49.9;
      }

      // best-effort description
      const desc =
        ld
          .flatMap((x) => (Array.isArray(x) ? x : [x]))
          .find((x) => x && typeof x === 'object' && (x['@type'] === 'Product'))?.description ||
        extractMetaContent(html, 'description') ||
        null;

      const category = inferCategory(html);

      const safeName = (name || 'Leon Model').toString().trim();
      const swissName = pickSwissName(safeName, usedNames);
      usedNames.add(swissName);

      return {
        url,
        ok: true,
        isPapuce: true,
        category,
        name: safeName,
        swissName,
        images,
        price,
        currency: priceInfo?.currency ?? null,
        description: typeof desc === 'string' ? desc.trim() : null,
      };
    } catch (e) {
      return { url, ok: false, error: e?.message || String(e) };
    } finally {
      if ((idx + 1) % 50 === 0) console.log('Processed', idx + 1, '/', urls.length);
    }
  });

  const papuce = raw.filter((r) => r?.ok && r?.isPapuce);
  const products = papuce.map((r) =>
    toProduct({
      url: r.url,
      name: r.name,
      description: r.description,
      images: r.images,
      priceCHF: Number(r.price),
      category: r.category,
      swissName: r.swissName,
    })
  );

  fs.writeFileSync(OUT_RAW, JSON.stringify({ generatedAt: new Date().toISOString(), total: raw.length, papuce: papuce.length, raw }, null, 2), 'utf8');

  const ts = `/* AUTO-GENERATED by scripts/leon-scrape-papuce.mjs */\n` +
    `// No type import here (generated file).\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`;

  fs.writeFileSync(OUT_TS, ts, 'utf8');

  console.log('Done.');
  console.log('Papuce products:', products.length);
  console.log('Wrote:', OUT_TS);
  console.log('Wrote:', OUT_RAW);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

