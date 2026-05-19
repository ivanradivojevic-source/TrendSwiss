import type { CategoryId } from './categories';
import type { Product } from './products';
import { leonStripColorSuffixParts } from './leonColorStrip';
import leonRaw from './leon-products.raw.json';
import leonMissingRaw from './leon-missing-import.raw.json';
import {
  buildLeonLocalizedProductName,
  buildLocalizedDescriptions,
  leonModelGroupBaseFromLeonUrl,
  leonProductLineSlugFromPath,
  pathSlugFromLeonUrl,
  stripColorsFromPathSlug,
} from './leonMultiLocale';

export { leonStripColorSuffixParts } from './leonColorStrip';

/** Leon.rs PDP colour families — slug list overrides CDN/URL stem grouping. */
const LEON_EXPLICIT_MODEL_GROUP_BY_SLUG = new Map<string, string>([
  ...[
    'edita-bela',
    'edita-crna',
    'edita-mint',
    'edita-perla',
    'edita-sampanj',
    'edita-teget',
    'edita-zelena-perlato',
    'edita-orlando-bez',
    'edita-orlando-braon',
    'edita-orlando-roza',
  ].map((slug) => [slug, 'leon-mg-edita-4250-women'] as const),
  ...[
    'edita-crazy-bez',
    'edita-crazy-braon-dark',
    'edita-crazy-crna',
    'edita-crazy-maslinasto-zelena',
    'edita-crazy-roze',
    'edita-crazy-siva',
  ].map((slug) => [slug, 'leon-mg-edita-crazy-women'] as const),
  ...[
    'portofino-i-zlatna',
    'portofino-roze-bakkar',
    'portofino-crna-bakkar',
    'portofino-bela-bakkar',
  ].map((slug) => [slug, 'leon-mg-portofino-6010-women'] as const),
  ...['liora-zelena', 'liora-i-crna', 'liora-i-bela'].map(
    (slug) => [slug, 'leon-mg-liora-i-women'] as const
  ),
  ...['liora-ii-zlatna', 'liora-ii-crna', 'liora-ii-bela'].map(
    (slug) => [slug, 'leon-mg-liora-ii-women'] as const
  ),
  ...['mia-roze-bakkar', 'mia-crna-bakkar', 'mia-bela-bakkar'].map(
    (slug) => [slug, 'leon-mg-mia-4019-women'] as const
  ),
  ...['mia-ii-orlando-braon', 'mia-ii-orlando-crvena'].map(
    (slug) => [slug, 'leon-mg-mia-ii-women'] as const
  ),
  ...['helen-zlato-zmija', 'helen-roze-zmija'].map(
    (slug) => [slug, 'leon-mg-helen-4300-women'] as const
  ),
]);

function explicitModelGroupId(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return LEON_EXPLICIT_MODEL_GROUP_BY_SLUG.get(slug);
}

/** Keep catalogue copy when already filled from leon.rs (not the auto template). */
function isGenericLeonDescription(desc: Product['description'] | undefined): boolean {
  if (!desc?.en?.trim()) return true;
  const generic = [
    'with a soft anatomical footbed',
    'with a comfortable anatomical footbed',
    'mit weichem, anatomischem Fussbett',
    'mit bequemem, anatomischem Fussbett',
  ];
  return generic.some((m) => desc.en?.includes(m) || desc.de?.includes(m));
}

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
export function leonModelBaseKeyFromImageUrl(
  imageUrl: string,
  slugHint?: string
): string | null {
  const stem = leonPrimaryImageStem(imageUrl);
  if (!stem) return null;
  const parts = stem.split(/[-_]/).filter(Boolean);
  if (!parts.length) return null;
  const stripped = leonStripColorSuffixParts(parts);
  const base = stripped.length ? stripped.join('-') : stem.toLowerCase();
  // CDN kod (6016) → ime linije iz sluga (anchor), ne mešati sa drugim modelima
  if (/^\d{3,4}[a-z]?$/i.test(base) && slugHint) {
    const line = leonProductLineSlugFromPath(slugHint);
    if (line && line !== base) return line;
  }
  return base;
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

function getLeonMissingImportRows(): LeonRawRow[] {
  const data = leonMissingRaw as { newRaw?: LeonRawRow[] };
  return data.newRaw ?? [];
}

function buildLeonRawLookups(relevant: LeonRawRow[]) {
  const byImage = new Map<string, LeonRawRow>();
  const bySlug = new Map<string, LeonRawRow>();

  const add = (r: LeonRawRow) => {
    const img = r.images?.[0];
    if (img) byImage.set(img, r);
    const slug = r.url ? pathSlugFromLeonUrl(r.url) : null;
    if (slug) bySlug.set(slug, r);
  };

  for (const r of relevant) add(r);
  for (const r of getLeonMissingImportRows()) add(r);

  return { byImage, bySlug };
}

function rawForProduct(
  p: Product,
  byImage: Map<string, LeonRawRow>,
  bySlug: Map<string, LeonRawRow>
): LeonRawRow | undefined {
  return byImage.get(p.image) ?? bySlug.get(p.slug);
}

function leonUrlForProduct(p: Product, raw?: LeonRawRow): string {
  if (raw?.url) return raw.url;
  return `https://leon.rs/p/${p.slug}/`;
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

  const { byImage, bySlug } = buildLeonRawLookups(relevant);

  const groupBaseKeys = leonProducts.map((p) => {
    const raw = rawForProduct(p, byImage, bySlug);
    const url = leonUrlForProduct(p, raw);
    return (
      leonModelGroupBaseFromLeonUrl(url) ??
      leonModelBaseKeyFromImageUrl(p.image, p.slug) ??
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

  const modelSlugBasePerIndex = leonProducts.map((p) => {
    const raw = rawForProduct(p, byImage, bySlug);
    const url = leonUrlForProduct(p, raw);
    const full = pathSlugFromLeonUrl(url);
    return leonProductLineSlugFromPath(full) || full || p.slug;
  });

  return leonProducts.map((p, i) => {
    const raw = rawForProduct(p, byImage, bySlug);
    const category = categoryForLeonProduct(p);
    const modelGroupId = explicitModelGroupId(p.slug) ?? modelGroupPerIndex[i];
    const titleForColor = raw?.name ? cleanLeonProductTitle(raw.name) : undefined;
    const name = buildLeonLocalizedProductName({
      rawUrl: leonUrlForProduct(p, raw),
      modelSlugBase: modelSlugBasePerIndex[i],
      rawTitle: titleForColor,
    });
    const description =
      p.description && !isGenericLeonDescription(p.description)
        ? p.description
        : buildLocalizedDescriptions(category, name);

    return {
      ...p,
      name,
      description,
      ...(modelGroupId ? { modelGroupId } : {}),
    };
  });
}
