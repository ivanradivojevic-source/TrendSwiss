/**
 * Repair Leon catalogue:
 * - align slug/id with leon.rs URL from primary image
 * - fetch SKU + color from leon.rs (refresh cache)
 * - dedupe fake Swiss-slug rows
 * - re-normalize names + model groups
 *
 * npx tsx scripts/repair-leon-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo, leonSlugFromUrl } from './fetch-leon-sku.mjs';
import {
  LEON_ARTICLE_SIZE_OVERRIDES,
  LEON_WOMEN_PAPUCE_SANDALE_SIZES,
  buildPapuceSandaleSlugSet,
  isExcelChildrenArticle,
  rebuildProductSizes,
  sizesForArticle,
} from './leon-size-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const DELAY_MS = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function buildRawMaps() {
  const urlByImage = new Map();
  const validSlugs = new Set();
  const imagesBySlug = new Map();
  const files = [
    path.join(ROOT, 'data', 'leon-products.raw.json'),
    path.join(ROOT, 'data', 'leon-missing-import.raw.json'),
  ];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    const data = readJson(fp);
    const rows = Array.isArray(data) ? data : data.raw ?? data.newRaw ?? [];
    for (const r of rows) {
      if (!r?.url || !r?.images?.[0]) continue;
      const slug = leonSlugFromUrl(r.url);
      if (!slug) continue;
      validSlugs.add(slug);
      urlByImage.set(r.images[0], r.url);
      const prev = imagesBySlug.get(slug);
      if (!prev || (r.images?.length ?? 0) > prev.length) imagesBySlug.set(slug, r.images);
    }
  }
  return { urlByImage, validSlugs, imagesBySlug };
}

function primaryStem(url) {
  const m = url?.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)/i);
  return m?.[1]?.toLowerCase() ?? null;
}

/** 4015-Sivi-velur1 / 4015-Sivi-velur2 / 4015-T.braon1_ → same gallery family. */
function galleryFamilyKey(stem) {
  if (!stem) return null;
  return stem.replace(/\d+_?$/i, '').replace(/_$/i, '');
}

function imageBelongsToStem(imgUrl, productStem) {
  const imgKey = galleryFamilyKey(primaryStem(imgUrl));
  const productKey = galleryFamilyKey(productStem);
  if (!imgKey || !productKey) return false;
  return imgKey === productKey;
}

function filterGalleryImages(primaryImage, rawImages) {
  const stem = primaryStem(primaryImage);
  if (!stem || !Array.isArray(rawImages)) return undefined;
  const kept = [];
  for (const img of rawImages) {
    if (/favicon|logo\.png/i.test(img)) continue;
    if (!imageBelongsToStem(img, stem)) continue;
    if (!kept.includes(img)) kept.push(img);
  }
  if (primaryImage && !kept.includes(primaryImage)) kept.unshift(primaryImage);
  const ordered =
    primaryImage && kept.includes(primaryImage)
      ? [primaryImage, ...kept.filter((u) => u !== primaryImage)]
      : kept;
  return ordered.length > 1 ? ordered : undefined;
}

function applyGalleryFromRaw(p, imagesBySlug, urlByImage) {
  const leonUrl = urlByImage.get(p.image);
  const slug = leonUrl ? leonSlugFromUrl(leonUrl) : validSlugOrNull(p.slug);
  const rawImages = slug ? imagesBySlug.get(slug) : undefined;
  p.images = filterGalleryImages(p.image, rawImages) ?? p.images;
}

function validSlugOrNull(slug) {
  return typeof slug === 'string' && slug.length ? slug : null;
}

function cleanProductImages(p) {
  if (!Array.isArray(p.images)) return;
  p.images = filterGalleryImages(p.image, p.images);
}

async function scrapeLeonGallery(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return [
    ...new Set(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|webp)/gi)].map(
        (m) => m[0]
      )
    ),
  ];
}

/** Leon.rs pages missing from import scrape (typos in slug). */
const LEON_EXTRA_PRODUCT_PAGES = [
  {
    url: 'https://leon.rs/p/orbira-mink/',
    slug: 'orbira-mink',
    cloneSlug: 'orbita-braon',
    articleNumber: '4015',
    primaryImage: 'https://cdn.leon.rs/wp-content/uploads/2026/04/4015-Mink1.jpg',
    colorLabel: 'Mink',
  },
  {
    url: 'https://leon.rs/p/line-crna/',
    slug: 'line-crna',
    cloneSlug: 'line-zelena',
    articleNumber: '510',
    primaryImage: 'https://cdn.leon.rs/wp-content/uploads/2026/04/510-Crna-velur1.jpg',
    colorLabel: 'Crna',
  },
];

/** Slug prefix → shop category when scrape/import mis-filed the row. */
const LEON_CATEGORY_BY_SLUG_PREFIX = {
  'linea-': 'women',
  'liena-': 'women',
};

function cloneLeonProduct(template, { slug, image, articleNumber, colorLabel }) {
  const skuBase = slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const variants = (template.variants ?? []).map((v) => ({
    ...v,
    sku: `LEON-${skuBase}-${v.size}-${v.color}`,
  }));
  return {
    ...template,
    id: `leon-${slug}`,
    slug,
    image,
    images: undefined,
    articleNumber,
    ...(colorLabel ? { colorLabel } : {}),
    variants,
  };
}

async function ensureExtraLeonProducts(products, imagesBySlug, urlByImage, validSlugs) {
  const slugs = new Set(products.map((p) => p.slug));
  let added = 0;
  for (const extra of LEON_EXTRA_PRODUCT_PAGES) {
    if (slugs.has(extra.slug)) continue;
    const template = products.find((p) => p.slug === extra.cloneSlug);
    if (!template) {
      console.warn('Skip extra product, no template:', extra.slug);
      continue;
    }
    let gallery = imagesBySlug.get(extra.slug);
    if (!gallery?.length) {
      try {
        gallery = await scrapeLeonGallery(extra.url);
        imagesBySlug.set(extra.slug, gallery);
      } catch (e) {
        console.warn('Gallery scrape failed:', extra.slug, e?.message);
        gallery = [extra.primaryImage];
      }
    }
    const primary =
      gallery.find((u) => u.includes('4015-Mink1')) ?? gallery.find((u) => /4015-mink/i.test(u)) ?? extra.primaryImage;
    const row = cloneLeonProduct(template, {
      slug: extra.slug,
      image: primary,
      articleNumber: extra.articleNumber,
      colorLabel: extra.colorLabel,
    });
    applyGalleryFromRaw(row, imagesBySlug, urlByImage);
    cleanProductImages(row);
    products.push(row);
    validSlugs.add(extra.slug);
    urlByImage.set(row.image, extra.url);
    slugs.add(extra.slug);
    added++;
    console.log('Added missing Leon product:', extra.slug);
  }
  return added;
}

function colorLabelFromImage(image) {
  const stem = primaryStem(image);
  if (!stem) return null;
  const parts = stem.split(/[-_]/).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(1).join('-').toUpperCase();
}

/** Rebuild size list + variants to match leon.rs (drops sizes not offered there). */
function applyLeonSizesToProduct(p, leonSizes) {
  if (!leonSizes?.length) return false;
  const colors = p.colors ?? [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const skuBase = (p.slug ?? 'leon').replace(/-/g, '').toUpperCase().slice(0, 18);
  const price =
    p.variants?.find((v) => typeof v.priceCHF === 'number')?.priceCHF ??
    p.variants?.[0]?.priceCHF ??
    0;
  p.sizes = leonSizes.map((s) => ({
    id: s,
    label: { de: s, fr: s, en: s, it: s },
  }));
  p.variants = leonSizes.flatMap((size) =>
    colors.map((c) => ({
      size,
      color: c.id,
      sku: `LEON-${skuBase}-${size}-${c.id}`,
      priceCHF: price,
      stock: 10,
    }))
  );
  return true;
}

function leonUrlForProduct(p, urlByImage, validSlugs) {
  return (
    urlByImage.get(p.image) ??
    (validSlugs.has(p.slug) ? `https://leon.rs/p/${p.slug}/` : null)
  );
}

async function getPageInfo(slug, url, cache) {
  const cached = cache[slug];
  if (cached?.sifra && !cached.error) return cached;
  try {
    const info = await fetchLeonPageInfo(url);
    cache[slug] = { ...info, fetchedAt: new Date().toISOString() };
    return info;
  } catch (e) {
    cache[slug] = { url, error: e?.message || String(e), fetchedAt: new Date().toISOString() };
    return cache[slug];
  }
}

async function main() {
  const papuceSandaleSlugs = buildPapuceSandaleSlugSet(ROOT);
  const { urlByImage, validSlugs, imagesBySlug } = buildRawMaps();
  let products = loadLeonProducts();
  const cache = fs.existsSync(CACHE_PATH) ? readJson(CACHE_PATH) : {};

  const extraAdded = await ensureExtraLeonProducts(products, imagesBySlug, urlByImage, validSlugs);
  if (extraAdded) console.log('Extra Leon products added:', extraAdded);

  const byImage = new Map();
  for (const p of products) {
    if (!byImage.has(p.image)) byImage.set(p.image, []);
    byImage.get(p.image).push(p);
  }

  const dropIds = new Set();
  for (const [, group] of byImage) {
    if (group.length < 2) continue;
    const withLeonUrl = group.filter((p) => urlByImage.has(p.image));
    if (!withLeonUrl.length) continue;
    const keep = withLeonUrl.sort((a, b) => {
      const aOk = validSlugs.has(a.slug) ? 1 : 0;
      const bOk = validSlugs.has(b.slug) ? 1 : 0;
      return bOk - aOk || a.slug.localeCompare(b.slug);
    })[0];
    for (const p of group) {
      if (p.id !== keep.id) dropIds.add(p.id);
    }
  }

  products = products.filter((p) => !dropIds.has(p.id));
  console.log('Removed duplicate rows:', dropIds.size);

  const urlsToFetch = new Map();
  for (const p of products) {
    const leonUrl = leonUrlForProduct(p, urlByImage, validSlugs);
    if (!leonUrl) continue;
    const leonSlug = leonSlugFromUrl(leonUrl);
    if (!leonSlug) continue;
    urlsToFetch.set(leonSlug, leonUrl);
  }

  console.log('Fetching SKU + sizes from leon.rs for', urlsToFetch.size, 'URLs...');
  let fetched = 0;
  for (const [slug, url] of urlsToFetch) {
    const cached = cache[slug];
    if (cached?.sifra && !cached.error) continue;
    process.stdout.write(`  ${slug}...`);
    await getPageInfo(slug, url, cache);
    fetched++;
    console.log(cache[slug]?.sifra ? ` ${cache[slug].sifra}` : ` ERR`);
    await sleep(DELAY_MS);
  }
  if (fetched) fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');

  let skuApplied = 0;
  let noSku = 0;
  let slugFixed = 0;

  let galleriesApplied = 0;
  let sizesSynced = 0;
  for (const p of products) {
    applyGalleryFromRaw(p, imagesBySlug, urlByImage);
    cleanProductImages(p);
    if (p.images?.length > 1) galleriesApplied++;
    const leonUrl = leonUrlForProduct(p, urlByImage, validSlugs);
    const leonSlug = leonUrl ? leonSlugFromUrl(leonUrl) : validSlugs.has(p.slug) ? p.slug : null;

    if (leonSlug && p.slug !== leonSlug) {
      p.slug = leonSlug;
      p.id = `leon-${leonSlug}`;
      slugFixed++;
    }

    const info = leonSlug ? cache[leonSlug] : null;

    if (info?.sifra) {
      p.articleNumber = info.sifra;
      skuApplied++;
    } else {
      delete p.articleNumber;
      noSku++;
    }

    if (info?.colorLabel) {
      p.colorLabel = info.colorLabel;
    } else if (info?.title) {
      const parts = info.title.split(/\s*[–—]\s*/).map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2) p.colorLabel = parts[parts.length - 1];
    } else {
      const fromImg = colorLabelFromImage(p.image);
      if (fromImg) p.colorLabel = fromImg;
      else delete p.colorLabel;
    }

    if (info?.sizes?.length && applyLeonSizesToProduct(p, info.sizes)) sizesSynced++;
    else if (p.category === 'women' && papuceSandaleSlugs.has(p.slug)) {
      const override = sizesForArticle(p.articleNumber);
      const target = override ?? LEON_WOMEN_PAPUCE_SANDALE_SIZES;
      if (applyLeonSizesToProduct(p, target)) sizesSynced++;
    }
  }

  for (const p of products) {
    if (isExcelChildrenArticle(p.articleNumber)) {
      p.category = 'children';
    } else {
      for (const [prefix, category] of Object.entries(LEON_CATEGORY_BY_SLUG_PREFIX)) {
        if (p.slug?.startsWith(prefix)) {
          p.category = category;
          break;
        }
      }
    }
  }

  const { normalizeLeonImportedProducts } = await import('../data/leonCatalogNormalize.ts');
  let normalized = normalizeLeonImportedProducts(products);

  const byGroup = new Map();
  for (const p of normalized) {
    if (!p.modelGroupId) continue;
    if (!byGroup.has(p.modelGroupId)) byGroup.set(p.modelGroupId, []);
    byGroup.get(p.modelGroupId).push(p);
  }
  let propagated = 0;
  for (const group of byGroup.values()) {
    const broj = group.find((p) => p.articleNumber)?.articleNumber;
    if (!broj) continue;
    for (const p of group) {
      if (!p.articleNumber) {
        p.articleNumber = broj;
        propagated++;
      }
    }
  }
  if (propagated) console.log('SKU propagated within colour groups:', propagated);

  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — repaired ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(normalized, null, 2)};\n`,
    'utf8'
  );

  console.log('Leon products:', normalized.length);
  console.log('Slugs aligned to leon.rs:', slugFixed);
  console.log('SKU applied:', skuApplied);
  console.log('No SKU:', noSku);
  console.log('Products with 2+ gallery images:', galleriesApplied);
  console.log('Sizes synced from leon.rs:', sizesSynced);

  const { execSync } = await import('node:child_process');
  execSync('npx tsx scripts/build-leon-slug-redirects.mjs', { cwd: ROOT, stdio: 'inherit' });

  const redirectsPath = path.join(ROOT, 'data', 'leon-slug-redirects.json');
  const redirects = fs.existsSync(redirectsPath) ? readJson(redirectsPath) : {};
  const manualRedirects = {
    'orbita-mink': 'orbira-mink',
    'linea-braon': 'liena-braon',
  };
  const merged = { ...redirects, ...manualRedirects };
  if (JSON.stringify(merged) !== JSON.stringify(redirects)) {
    fs.writeFileSync(redirectsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    console.log('Manual slug redirects merged:', Object.keys(manualRedirects).join(', '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
