import type { CategoryId } from './categories';
import type { Product } from './products';
import { leonStripColorSuffixParts } from './leonColorStrip';
import leonRaw from './leon-products.raw.json';
import {
  buildLeonLocalizedProductName,
  buildLocalizedDescriptions,
  leonModelGroupBaseFromLeonUrl,
  pathSlugFromLeonUrl,
  stripColorsFromPathSlug,
} from './leonMultiLocale';

export { leonStripColorSuffixParts } from './leonColorStrip';

type LeonRawRow = {
  url?: string;
  name?: string;
  images?: string[];
  ok?: boolean;
  relevant?: boolean;
  genderCategory?: CategoryId;
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#8211;/gi, '–')
    .replace(/&#8212;/gi, '—')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Title from LEON → shop display (all locales use same string until you add translations). */
export function cleanLeonProductTitle(rawTitle: string): string {
  let s = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*[|–—]\s*Leon\s*$/i, '').replace(/\s+Leon\s*$/i, '').trim();
  return s;
}

/** Filename stem without extension, trailing gallery index removed (…Perla1 → …Perla). */
export function leonPrimaryImageStem(imageUrl: string): string | null {
  const m = imageUrl.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)(?:\?|$)/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\d+$/i, '');
}

/**
 * Groups colour variants from the LEON primary image stem (e.g. 300-Crna / 300-Bela → "300";
 * Andora-II-Zelena → "andora-ii"). Prefer {@link leonModelGroupBaseFromLeonUrl} for `modelGroupId`.
 */
export function leonModelBaseKeyFromImageUrl(imageUrl: string): string | null {
  const stem = leonPrimaryImageStem(imageUrl);
  if (!stem) return null;
  const parts = stem.split(/[-_]/).filter(Boolean);
  if (!parts.length) return null;
  const stripped = leonStripColorSuffixParts(parts);
  if (!stripped.length) return stem.toLowerCase();
  return stripped.join('-');
}

function slugifyModelGroupKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72);
}

function getLeonRelevantRows(): LeonRawRow[] {
  return (leonRaw.raw as LeonRawRow[]).filter((r) => r?.ok && r?.relevant);
}

/**
 * Use the catalogue row’s `category` (from scrape), not `raw.genderCategory` looked up by image:
 * many LEON lines share the same CDN hero image (e.g. 4270 grey for both women’s and men’s models),
 * so `byImage` can point at the wrong raw row and mis-gender the product.
 */
function categoryForLeonProduct(p: Product): CategoryId {
  return p.category;
}

/** Composite cache key: same CDN stem often appears on men's and women's lines (e.g. 4270 vs 4770M). */
function modelGroupCompositeKey(baseKey: string, category: CategoryId): string {
  return `${baseKey}|||${category}`;
}

/**
 * Fixes LEON catalogue rows: real product titles (instead of random Swiss pool names),
 * descriptions aligned with that title, and `modelGroupId` for CDN-based colour families.
 */
export function normalizeLeonImportedProducts(leonProducts: readonly Product[]): Product[] {
  const relevant = getLeonRelevantRows();
  if (relevant.length !== leonProducts.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[leonCatalogNormalize] raw relevant (${relevant.length}) vs leonProducts (${leonProducts.length}) — pairing by primary image.`
    );
  }

  const byImage = new Map<string, LeonRawRow>();
  for (const r of relevant) {
    const img = r.images?.[0];
    if (img) byImage.set(img, r);
  }

  const groupBaseKeys = leonProducts.map((p, i) => {
    const raw = byImage.get(p.image) ?? relevant[i];
    return (
      leonModelGroupBaseFromLeonUrl(raw?.url) ??
      leonModelBaseKeyFromImageUrl(p.image) ??
      p.slug
    );
  });

  const categories = leonProducts.map((p) => categoryForLeonProduct(p));

  const keyCounts = new Map<string, number>();
  for (let i = 0; i < leonProducts.length; i++) {
    const ck = modelGroupCompositeKey(groupBaseKeys[i], categories[i]);
    keyCounts.set(ck, (keyCounts.get(ck) ?? 0) + 1);
  }

  const modelGroupPerIndex = leonProducts.map((_, i) => {
    const baseKey = groupBaseKeys[i];
    const category = categories[i];
    const ck = modelGroupCompositeKey(baseKey, category);
    const groupSlug = slugifyModelGroupKey(`${baseKey}-${category}`);
    const cnt = keyCounts.get(ck) ?? 0;
    const allowGroup = cnt > 1;
    return allowGroup && groupSlug.length ? (`leon-mg-${groupSlug}` as const) : undefined;
  });

  const mgAnchorIndex = new Map<string, number>();
  modelGroupPerIndex.forEach((mg, i) => {
    if (mg && !mgAnchorIndex.has(mg)) mgAnchorIndex.set(mg, i);
  });

  const modelSlugBasePerIndex = leonProducts.map((p, i) => {
    const raw = byImage.get(p.image) ?? relevant[i];
    const url = raw?.url ?? '';
    const full = pathSlugFromLeonUrl(url);
    const stripped = stripColorsFromPathSlug(full);
    const mg = modelGroupPerIndex[i];
    if (mg) {
      const anchor = mgAnchorIndex.get(mg) ?? i;
      const rawA = byImage.get(leonProducts[anchor].image) ?? relevant[anchor];
      const fullA = pathSlugFromLeonUrl(rawA?.url ?? '');
      return stripColorsFromPathSlug(fullA) || fullA || p.slug;
    }
    return stripped || full || p.slug;
  });

  return leonProducts.map((p, i) => {
    const raw = byImage.get(p.image) ?? relevant[i];
    const category = categoryForLeonProduct(p);
    const modelGroupId = modelGroupPerIndex[i];
    const titleForColor = raw?.name ? cleanLeonProductTitle(raw.name) : undefined;
    const name = buildLeonLocalizedProductName({
      rawUrl: raw?.url ?? '',
      modelSlugBase: modelSlugBasePerIndex[i],
      rawTitle: titleForColor,
    });
    const description = buildLocalizedDescriptions(category, name);

    return {
      ...p,
      name,
      description,
      ...(modelGroupId ? { modelGroupId } : {}),
    };
  });
}
