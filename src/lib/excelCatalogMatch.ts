/**
 * Map Tabela Cene.xlsx rows → shop Product[] (isti princip kao apply-excel-prices).
 */
import type { Product } from '@/data/products';
import { leonModelBaseKeyFromImageUrl } from '@/data/leonCatalogNormalize';
import {
  normalizeLeonColorSlugKey,
  pathSlugFromLeonUrl,
  stripColorsFromPathSlug,
} from '@/data/leonMultiLocale';
import leonRaw from '@/data/leon-products.raw.json';

export type ExcelPriceRow = {
  broj: string;
  naziv: string;
  maloprodajna: number;
};

type LeonRawRow = {
  url?: string;
  images?: string[];
  ok?: boolean;
  relevant?: boolean;
};

const byImage = new Map<string, LeonRawRow>();
for (const r of (leonRaw.raw as LeonRawRow[]) ?? []) {
  if (r?.ok && r?.relevant && r.images?.[0]) byImage.set(r.images[0], r);
}

const ROMAN_WORD: Record<string, string> = {
  '1': 'i',
  '2': 'ii',
  '3': 'iii',
  '4': 'iv',
  '5': 'v',
};

const EXCEL_STEM_ALIASES: Record<string, string[]> = {
  siena2: ['siena-ii', 'siena-2'],
  siena1: ['siena-i', 'siena-1'],
  'nora-5': ['nora-iv', 'nora-v', 'nora-5'],
  rubikon: ['rubicon'],
  rubicon: ['rubicon'],
};

function normKey(s: string): string {
  return normalizeLeonColorSlugKey(s.replace(/\*/g, ''))
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function excelNameKeys(naziv: string): string[] {
  const keys = new Set([normKey(naziv)]);
  const m = naziv.trim().match(/^(.+?)\s+(\d+)\s*$/);
  if (m) {
    const stem = normKey(m[1]);
    keys.add(`${stem}-${m[2]}`);
    const rw = ROMAN_WORD[m[2]];
    if (rw) keys.add(`${stem}-${rw}`);
  }
  return [...keys];
}

function hasVariantSuffix(key: string): boolean {
  return /-(?:\d+|i{1,3}|iv|v)$/.test(key);
}

function nameMatch(excelNaziv: string, productStem: string | null, urlSlug: string | null): boolean {
  if (!productStem && !urlSlug) return false;
  const eKeys = excelNameKeys(excelNaziv);
  const pKeys = new Set<string>();
  if (productStem) pKeys.add(productStem);
  if (urlSlug) {
    pKeys.add(urlSlug);
    pKeys.add(stripColorsFromPathSlug(urlSlug));
  }
  for (const ek of eKeys) {
    for (const pk of pKeys) {
      if (ek === pk) return true;
    }
  }
  if (eKeys.some((k) => hasVariantSuffix(k))) return false;
  const baseOnly = normKey(excelNaziv.split(/\s+\d/)[0] ?? excelNaziv);
  for (const pk of pKeys) {
    if (pk === baseOnly && !hasVariantSuffix(pk)) return true;
  }
  return false;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function brojMatch(broj: string, p: Product, stem: string | null): boolean {
  const b = broj.toLowerCase();
  const segmentsFrom = (s: string) =>
    s
      .toLowerCase()
      .split(/[-_/]+/)
      .map((x) => x.replace(/\d+$/i, ''))
      .filter(Boolean);

  const segSets: string[][] = [];
  if (stem) segSets.push(segmentsFrom(stem));
  const imgFile = p.image.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)/i)?.[1];
  if (imgFile) {
    segSets.push(segmentsFrom(imgFile));
    const low = imgFile.toLowerCase();
    if (low.startsWith(`${b}-`) || low.includes(`-${b}-`)) return true;
  }
  if (p.slug?.toLowerCase().includes(b)) return true;
  if (p.articleNumber?.toLowerCase() === b) return true;
  const raw = byImage.get(p.image);
  if (raw?.url) {
    const slug = pathSlugFromLeonUrl(raw.url);
    if (slug) segSets.push(segmentsFrom(slug));
  }
  for (const parts of segSets) {
    if (parts.some((part) => part === b)) return true;
  }
  const desc = `${p.description?.en ?? ''} ${p.description?.de ?? ''}`;
  if (new RegExp(`\\b${escapeRe(b)}\\b`, 'i').test(desc)) return true;
  return false;
}

function slugNameMatch(excelNaziv: string, p: Product, stem: string | null): boolean {
  const eKeys = excelNameKeys(excelNaziv);
  const slug = p.slug?.toLowerCase() ?? '';
  const pathSlug = slug.replace(/^leon-/, '');
  const aliases = new Set<string>();
  for (const ek of eKeys) {
    aliases.add(ek);
    for (const a of EXCEL_STEM_ALIASES[ek] ?? []) aliases.add(a);
  }
  for (const ek of aliases) {
    if (slug.includes(ek) || pathSlug.startsWith(`${ek}-`) || pathSlug === ek) return true;
    if (stem && (stem === ek || stem.startsWith(`${ek}-`) || stem.includes(ek))) return true;
  }
  return false;
}

function productKeys(p: Product) {
  const stem = leonModelBaseKeyFromImageUrl(p.image, p.slug);
  const raw = byImage.get(p.image);
  const urlSlug = raw?.url ? pathSlugFromLeonUrl(raw.url) : null;
  return { stem, urlSlug };
}

/** Proizvodi iz kataloga koji odgovaraju jednom Excel redu (+ boje iz iste model grupe). */
export function matchProductsForExcelRow(row: ExcelPriceRow, catalog: Product[]): Product[] {
  const hits = new Set<Product>();

  for (const p of catalog) {
    const { stem, urlSlug } = productKeys(p);
    if (
      brojMatch(row.broj, p, stem) ||
      nameMatch(row.naziv, stem, urlSlug) ||
      slugNameMatch(row.naziv, p, stem)
    ) {
      hits.add(p);
    }
  }

  const expanded = new Set<Product>(hits);
  for (const p of hits) {
    if (!p.modelGroupId) continue;
    for (const sib of catalog) {
      if (sib.modelGroupId === p.modelGroupId) expanded.add(sib);
    }
  }

  return [...expanded];
}

/** Jedinstveni slugovi svih proizvoda koji su na Excel listi cena. */
export function excelPricedProductSlugs(catalog: Product[], excelRows: ExcelPriceRow[]): string[] {
  const slugs = new Set<string>();
  for (const row of excelRows) {
    for (const p of matchProductsForExcelRow(row, catalog)) {
      slugs.add(p.slug);
    }
  }
  return [...slugs].sort();
}
