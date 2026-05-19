/**
 * Leon.rs explore-categories scraper.
 *
 * Goal:
 * - Import products for these sections:
 *   - Papuče
 *   - Sobne papuče
 *   - Klompe
 *   - Medicinske klompe
 * - Generate:
 *   - data/leon-products.generated.ts (Product[] compatible)
 *   - data/leon-explore-tags.generated.ts (Record<ProductId, ExploreCategoryId[]>)
 *   - data/leon-products.raw.json (debug)
 *
 * Run:
 *   node scripts/leon-scrape-explore.mjs
 *
 * Notes:
 * - Uses cached sitemaps in scripts/_leon_sitemaps/
 * - Best-effort scraping; adjust CONCURRENCY / MAX_PRODUCTS if needed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { leonDefaultSizes } from './leon-size-rules.mjs';

const ROOT = path.resolve(process.cwd());
const SITEMAP_PRODUCTS_PATH = path.join(ROOT, 'scripts', '_leon_sitemaps', 'sitemap-post-type-product.xml');
const SITEMAP_CATS_PATH = path.join(ROOT, 'scripts', '_leon_sitemaps', 'sitemap-taxonomy-product_cat.xml');

const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const OUT_TAGS = path.join(ROOT, 'data', 'leon-explore-tags.generated.ts');
const OUT_RAW = path.join(ROOT, 'data', 'leon-products.raw.json');

const MAX_PRODUCTS = Number(process.env.LEON_MAX_PRODUCTS || '400'); // keep it bounded by default
const CONCURRENCY = Number(process.env.LEON_CONCURRENCY || '6');
const FETCH_TIMEOUT_MS = 25000;

function readFileText(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractLocsFromSitemap(xml) {
  const locs = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
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
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // ignore invalid JSON-LD blocks
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
  const esc = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  return m?.[1]?.trim() || null;
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

function extractGalleryImagesFromHtml(html) {
  // WooCommerce often stores full image URLs in data-large_image attributes.
  const urls = [];
  const re = /data-large_image=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    urls.push(m[1]);
  }

  // Fallback: direct links inside product gallery.
  const re2 = /<a[^>]+href=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["'][^>]*>\s*<img/gi;
  while ((m = re2.exec(html))) {
    urls.push(m[1]);
  }

  return uniq(urls);
}

function inferPriceFromJsonLd(ldList) {
  const candidates = [];
  const collect = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type'] === 'Product' || obj['@type']?.includes?.('Product')) candidates.push(obj);
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

function makeDefaultColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
  ];
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&#8211;/gi, '–')
    .replace(/&#8212;/gi, '—')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanLeonProductTitle(rawTitle) {
  let s = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*[|–—]\s*Leon\s*$/i, '').replace(/\s+Leon\s*$/i, '').trim();
  return s;
}

function baseForDescription(displayName) {
  const segs = displayName
    .split(/\s*[–—]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (segs.length <= 1) return displayName.trim();
  return segs.slice(0, -1).join(' – ');
}

function buildDescriptionsFromDisplay(category, displayName) {
  const baseName = baseForDescription(displayName) || 'Modell';
  if (category === 'men') {
    return {
      de: `Herrenmodell „${baseName}“ mit bequemem, anatomischem Fussbett.`,
      fr: `Modèle homme « ${baseName} » avec semelle intérieure anatomique confortable.`,
      en: `Men's model "${baseName}" with a comfortable anatomical footbed.`,
      it: `Modello da uomo «${baseName}» con plantare anatomico confortevole.`,
    };
  }
  if (category === 'children') {
    return {
      de: `Kindermodell „${baseName}“ mit rutschfester Sohle – bequem und sicher.`,
      fr: `Modèle enfant « ${baseName} » avec semelle antidérapante – confortable et sûr.`,
      en: `Kids' model "${baseName}" with a non-slip sole – comfy and safe.`,
      it: `Modello per bambini «${baseName}» con suola antiscivolo – comodo e sicuro.`,
    };
  }
  return {
    de: `Damenmodell „${baseName}“ mit weichem, anatomischem Fussbett.`,
    fr: `Modèle femme « ${baseName} » avec semelle intérieure anatomique douce.`,
    en: `Women's model "${baseName}" with a soft anatomical footbed.`,
    it: `Modello da donna «${baseName}» con plantare anatomico morbido.`,
  };
}

function pathSlugFromUrl(url) {
  const m = String(url).match(/\/p\/([^/]+)\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

function leonPrimaryImageStem(imageUrl) {
  const m = String(imageUrl).match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)(?:\?|$)/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\d+$/i, '');
}

const TWO_SUFFIX = new Set(
  [
    'crna-bakkar',
    'bela-bakkar',
    'roze-bakkar',
    'crna-lak',
    'siva-velur',
    'zelena-perlato',
    'crna-orlando',
    'braon-orlando',
    'plava-orlando',
    'led-orlando',
    'zlato-zmija',
    'roze-zmija',
    'bela-zmija',
    'zlato-sjaj',
    'crna-sjaj',
    'teget-bakkar',
    'zuta-velur',
    'roze-velur',
  ].map((s) => s.toLowerCase())
);

const ONE_SUFFIX = new Set(
  [
    'crna',
    'bela',
    'braon',
    'siva',
    'roze',
    'roza',
    'bez',
    'teget',
    'zelena',
    'zlatna',
    'zlato',
    'bordo',
    'perla',
    'perlato',
    'ciklama',
    'ljubicasta',
    'zuta',
    'maslinasto',
    'plava',
    'crvena',
    'sampanj',
    'mint',
    'dark',
    'white',
    'black',
    'blue',
    'navy',
    'yellow',
    'pink',
    'fuxia',
    'rust',
    'oily',
    'bakkar',
    'velur',
    'lak',
    'sjaj',
    'tbc',
    'puprle',
    'orladno',
  ].map((s) => s.toLowerCase())
);

function leonStripColorSuffixParts(partsIn) {
  const p = partsIn.map((x) => x.toLowerCase());
  while (p.length > 1) {
    const last = p[p.length - 1];
    if (/^\d{1,2}$/.test(last)) {
      p.pop();
      continue;
    }
    const prev = p[p.length - 2];
    if (last === 'orlando') {
      p.pop();
      p.pop();
      continue;
    }
    if (last === 'zmija') {
      p.pop();
      p.pop();
      continue;
    }
    if (last === 'sjaj') {
      p.pop();
      p.pop();
      continue;
    }
    const lastTwo = `${prev}-${last}`;
    if (TWO_SUFFIX.has(lastTwo)) {
      p.pop();
      p.pop();
      continue;
    }
    if (ONE_SUFFIX.has(last)) {
      p.pop();
      continue;
    }
    break;
  }
  return p;
}

function stripColorsFromPathSlug(fullSlug) {
  const parts = String(fullSlug)
    .split('-')
    .filter(Boolean);
  if (!parts.length) return fullSlug;
  const stripped = leonStripColorSuffixParts(parts);
  const joined = stripped.join('-');
  return joined || fullSlug;
}

function leonModelGroupBaseFromLeonUrl(url) {
  if (!url) return null;
  const full = pathSlugFromUrl(url);
  if (!full) return null;
  const stripped = stripColorsFromPathSlug(full);
  const out = (stripped || full).trim();
  return out.length ? out : null;
}

function leonModelBaseKeyFromImageUrl(imageUrl) {
  const stem = leonPrimaryImageStem(imageUrl);
  if (!stem) return null;
  const parts = stem.split(/[-_]/).filter(Boolean);
  if (!parts.length) return null;
  const stripped = leonStripColorSuffixParts(parts);
  if (!stripped.length) return stem.toLowerCase();
  return stripped.join('-');
}

function slugifyModelGroupKey(key) {
  return String(key)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72);
}

function attachModelGroupIds(products, sourceUrls) {
  const keys = products.map((p, i) => {
    const fromUrl = sourceUrls[i] ? leonModelGroupBaseFromLeonUrl(sourceUrls[i]) : null;
    return fromUrl || leonModelBaseKeyFromImageUrl(p.image) || p.slug;
  });
  const counts = new Map();
  for (let i = 0; i < products.length; i++) {
    const ck = `${keys[i]}|||${products[i].category}`;
    counts.set(ck, (counts.get(ck) || 0) + 1);
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const k = keys[i];
    const ck = `${k}|||${p.category}`;
    const cnt = counts.get(ck) || 0;
    if (cnt > 1) {
      p.modelGroupId = `leon-mg-${slugifyModelGroupKey(`${k}-${p.category}`)}`;
    }
  }
}

function inferGenderCategoryFromCrumbs(crumbsLower) {
  if (crumbsLower.includes('/decije-')) return 'children';
  if (crumbsLower.includes('/muske-')) return 'men';
  if (crumbsLower.includes('/zenske-')) return 'women';
  return 'women';
}

function inferExploreTagsFromCrumbs(crumbsLower) {
  const tags = [];
  if (crumbsLower.includes('/c/klompe')) tags.push('klompe');
  if (crumbsLower.includes('/c/sandale')) tags.push('sandale');
  if (crumbsLower.includes('/c/papuce')) tags.push('papuce');
  // Leon sometimes marks house slippers as "sobne-papuce" category,
  // and sometimes only via product slug/name like "kucna-papuca".
  if (crumbsLower.includes('sobne-papuce')) tags.push('sobne-papuce');
  if (crumbsLower.includes('medicinske-klompe')) tags.push('medicinske-klompe');
  return uniq(tags);
}

function isRelevantByCrumbs(crumbsLower) {
  return (
    crumbsLower.includes('/c/papuce') ||
    crumbsLower.includes('/c/klompe') ||
    crumbsLower.includes('/c/sandale')
  );
}

function toProduct({ displayName, slug, images, priceCHF, genderCategory, crumbs, exploreTags }) {
  const sizes = leonDefaultSizes(genderCategory, { crumbs, exploreTags, genderCategory });
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
  const img = images?.[0] || null;
  const desc = buildDescriptionsFromDisplay(genderCategory, displayName);

  return {
    id: `leon-${slug}`,
    slug,
    category: genderCategory,
    brand: 'leon',
    name: { de: displayName, fr: displayName, en: displayName, it: displayName },
    description: desc,
    image: img || 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80',
    images: images?.length ? images : undefined,
    sizes: sizes.map((s) => ({ id: s, label: { de: s, fr: s, en: s } })),
    colors,
    variants,
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
  if (!fs.existsSync(SITEMAP_PRODUCTS_PATH)) throw new Error(`Missing ${SITEMAP_PRODUCTS_PATH}`);
  if (!fs.existsSync(SITEMAP_CATS_PATH)) throw new Error(`Missing ${SITEMAP_CATS_PATH}`);

  const productSitemap = readFileText(SITEMAP_PRODUCTS_PATH);
  const catSitemap = readFileText(SITEMAP_CATS_PATH);

  const productUrls = extractLocsFromSitemap(productSitemap).filter((u) => u.includes('/p/'));
  const catUrls = extractLocsFromSitemap(catSitemap);
  const relevantCats = catUrls.filter((u) => u.includes('/c/papuce') || u.includes('/c/klompe') || u.includes('/c/sandale'));

  console.log('Found product URLs:', productUrls.length);
  console.log('Found relevant category URLs:', relevantCats.length);

  const urls = productUrls.slice(0, MAX_PRODUCTS);

  const raw = await mapLimit(urls, CONCURRENCY, async (url, idx) => {
    try {
      const res = await abortableFetch(url, {
        headers: {
          'user-agent': 'TrendSwissShopBot/0.1 (catalog import)',
          accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) return { url, ok: false, status: res.status };
      const html = await res.text();

      const ld = extractJsonLd(html);
      const crumbs = extractBreadcrumbUrlsFromJsonLd(ld);
      const crumbsLower = crumbs.join(' ').toLowerCase();
      if (!isRelevantByCrumbs(crumbsLower)) return { url, ok: true, relevant: false };

      let name =
        ld
          .flatMap((x) => (Array.isArray(x) ? x : [x]))
          .find((x) => x && typeof x === 'object' && x['@type'] === 'Product')?.name ||
        extractMetaContent(html, 'og:title') ||
        null;

      if (typeof name !== 'string' || !name.trim()) {
        const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
        name = t ? t.replace(/\s*\|\s*Leon.*$/i, '').trim() : null;
      }

      const images = uniq(
        [
          ...extractImagesFromJsonLd(ld),
          ...extractGalleryImagesFromHtml(html),
          ...(extractMetaContent(html, 'og:image') ? [extractMetaContent(html, 'og:image')] : []),
        ].filter(Boolean)
      );

      const priceInfo = inferPriceFromJsonLd(ld);
      let price = priceInfo?.price ?? null;
      if (!Number.isFinite(price) || price <= 0) price = inferPriceFromHtml(html) ?? 49.9;
      if (priceInfo?.currency && String(priceInfo.currency).toLowerCase() !== 'chf') price = 49.9;
      if (!priceInfo?.currency && Number(price) > 500) price = 49.9;

      const safeName = (name || 'Leon Model').toString().trim();

      const genderCategory = inferGenderCategoryFromCrumbs(crumbsLower);
      const exploreTags = inferExploreTagsFromCrumbs(crumbsLower);

      // "New" tag best-effort.
      const hay = `${safeName} ${extractMetaContent(html, 'description') ?? ''} ${url}`.toLowerCase();
      if (/(^|\W)(novo|new|neu|nouveau|novit[aà]|novita)(\W|$)/.test(hay)) exploreTags.push('novo');
      if (/(kucna-papuca|ku[cć]na\s+papu(c|č)a|house\s*slipper|indoor)/.test(hay)) exploreTags.push('sobne-papuce');

      return {
        url,
        ok: true,
        relevant: true,
        genderCategory,
        exploreTags: uniq(exploreTags),
        name: safeName,
        images,
        price,
        currency: priceInfo?.currency ?? null,
        crumbs,
      };
    } catch (e) {
      return { url, ok: false, error: e?.message || String(e) };
    } finally {
      if ((idx + 1) % 50 === 0) console.log('Processed', idx + 1, '/', urls.length);
    }
  });

  const relevant = raw.filter((r) => r?.ok && r?.relevant);
  const products = relevant.map((r) => {
    const displayName = cleanLeonProductTitle(r.name || 'Leon Model');
    const slug = pathSlugFromUrl(r.url) || slugify(displayName);
    return toProduct({
      displayName,
      slug,
      images: r.images,
      priceCHF: Number(r.price),
      genderCategory: r.genderCategory,
      crumbs: r.crumbs,
      exploreTags: r.exploreTags,
    });
  });

  attachModelGroupIds(
    products,
    relevant.map((r) => r.url)
  );

  const tagsMap = {};
  for (let i = 0; i < relevant.length; i++) {
    tagsMap[products[i].id] = relevant[i].exploreTags;
  }

  fs.writeFileSync(
    OUT_RAW,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), total: raw.length, relevant: relevant.length, raw },
      null,
      2
    ),
    'utf8'
  );

  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED by scripts/leon-scrape-explore.mjs */\n` +
      `// No type import here (generated file).\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );

  fs.writeFileSync(
    OUT_TAGS,
    `/* AUTO-GENERATED by scripts/leon-scrape-explore.mjs */\n` +
      `export const leonExploreTagsByProductId = ${JSON.stringify(tagsMap, null, 2)};\n`,
    'utf8'
  );

  console.log('Done.');
  console.log('Relevant products:', products.length);
  console.log('Wrote:', OUT_TS);
  console.log('Wrote:', OUT_TAGS);
  console.log('Wrote:', OUT_RAW);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

