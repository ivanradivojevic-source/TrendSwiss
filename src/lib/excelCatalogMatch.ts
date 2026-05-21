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
import leonSiteSkuCache from '../../scripts/leon-site-sku-cache.json';

type LeonSkuEntry = { sifra?: string };

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
  emili1: ['emili-i'],
  'emili-1': ['emili-i'],
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
  return Array.from(keys);
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
    for (const pk of Array.from(pKeys)) {
      if (ek === pk) return true;
    }
  }
  if (eKeys.some((k) => hasVariantSuffix(k))) return false;
  const baseOnly = normKey(excelNaziv.split(/\s+\d/)[0] ?? excelNaziv);
  for (const pk of Array.from(pKeys)) {
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

function pathMatchesExcelKey(pathSlug: string, ek: string): boolean {
  if (pathSlug === ek) return true;
  if (!pathSlug.startsWith(`${ek}-`)) return false;
  // liora-i ≠ liora-ii (slugNameMatch ranje hvatao liora-ii-zlatna za „Liora 1“)
  if (ek === 'liora-i' && pathSlug.startsWith('liora-ii')) return false;
  if ((ek === 'emili-i' || ek === 'emili-1' || ek === 'emili1') && pathSlug.startsWith('emili-iii')) {
    return false;
  }
  if (ek === 'anna-velur' || ek === 'anna-1') {
    if (!pathSlug.includes('velur') && pathSlug !== 'anna-braon') return false;
  }
  return true;
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
  for (const ek of Array.from(aliases)) {
    if (pathMatchesExcelKey(pathSlug, ek)) return true;
    if (stem && (stem === ek || stem.startsWith(`${ek}-`))) {
      if (ek === 'liora-i' && stem.startsWith('liora-ii')) continue;
      return true;
    }
  }
  return false;
}

function productKeys(p: Product) {
  const stem = leonModelBaseKeyFromImageUrl(p.image, p.slug);
  const raw = byImage.get(p.image);
  const urlSlug = raw?.url ? pathSlugFromLeonUrl(raw.url) : null;
  return { stem, urlSlug };
}

/** Šifra sa leon.rs (kolona C na sajtu proizvođača). */
export function leonCatalogSifra(slug: string): string | undefined {
  const entry = (leonSiteSkuCache as Record<string, LeonSkuEntry>)[slug];
  const s = entry?.sifra?.trim();
  return s || undefined;
}

/** Da li Excel red (kolona C + naziv) pripada ovom shop proizvodu. */
export function productMatchesExcelRow(row: ExcelPriceRow, p: Product): boolean {
  const slug = p.slug?.toLowerCase() ?? '';
  // V260 = Emili I only (Excel „Emili 1“), not Emili III.
  if (row.broj === 'V260' && slug.startsWith('emili-iii')) return false;

  const sifra = leonCatalogSifra(p.slug);
  const { stem, urlSlug } = productKeys(p);

  if (sifra) {
    if (row.broj === sifra) return true;
    if (brojMatch(row.broj, p, stem)) return true;
    return false;
  }

  return (
    brojMatch(row.broj, p, stem) ||
    nameMatch(row.naziv, stem, urlSlug) ||
    slugNameMatch(row.naziv, p, stem)
  );
}

/** Najbolji Excel red za proizvod (poslednji red u tabeli ako ima duplikata). */
export function findExcelRowForProduct(
  p: Product,
  excelRows: ExcelPriceRow[]
): ExcelPriceRow | null {
  const sifra = leonCatalogSifra(p.slug);
  if (sifra) {
    const byBroj = excelRows.filter((r) => r.broj === sifra);
    if (byBroj.length) return byBroj[byBroj.length - 1]!;
  }
  const matches = excelRows.filter((r) => productMatchesExcelRow(r, p));
  if (!matches.length) return null;
  return matches[matches.length - 1]!;
}

/** Proizvodi iz kataloga koji odgovaraju jednom Excel redu (+ boje iz iste model grupe). */
export function matchProductsForExcelRow(row: ExcelPriceRow, catalog: Product[]): Product[] {
  const hits = new Set<Product>();

  for (const p of catalog) {
    if (productMatchesExcelRow(row, p)) hits.add(p);
  }

  const expanded = new Set<Product>(hits);
  for (const p of Array.from(hits)) {
    if (!p.modelGroupId) continue;
    for (const sib of catalog) {
      if (sib.modelGroupId === p.modelGroupId && productMatchesExcelRow(row, sib)) {
        expanded.add(sib);
      }
    }
  }

  return Array.from(expanded);
}

/** Jedinstveni slugovi svih proizvoda koji su na Excel listi cena. */
export function excelPricedProductSlugs(catalog: Product[], excelRows: ExcelPriceRow[]): string[] {
  const slugs = new Set<string>();
  for (const row of excelRows) {
    for (const p of matchProductsForExcelRow(row, catalog)) {
      slugs.add(p.slug);
    }
  }
  return Array.from(slugs).sort();
}
