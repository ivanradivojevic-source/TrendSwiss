/**
 * Map Tabela Cene.xlsx rows → leon-products.generated.ts (isti princip kao apply-excel-prices).
 */
import { execSync } from 'node:child_process';
import { join } from 'node:path';

import { leonModelBaseKeyFromImageUrl } from '../data/leonCatalogNormalize';
import {
  normalizeLeonColorSlugKey,
  pathSlugFromLeonUrl,
  stripColorsFromPathSlug,
} from '../data/leonMultiLocale';
import type { Product } from '../data/products';

const EXCEL_PATH = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;

type ExcelRow = {
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

function brojMatch(
  broj: string,
  p: Product,
  stem: string | null,
  byImage: Map<string, LeonRawRow>
): boolean {
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

export function loadExcelRows(): ExcelRow[] {
  const py = join(__dirname, 'read-excel-prices.py');
  const raw = execSync(`python "${py}" "${EXCEL_PATH}"`, { encoding: 'utf8' });
  return (JSON.parse(raw) as ExcelRow[]).filter(
    (r) => r.naziv && Number.isFinite(r.maloprodajna)
  );
}

export function leonProductsOnExcelList(
  leonProducts: readonly Product[],
  leonRawRows: LeonRawRow[] = []
): { excelRowCount: number; products: Product[]; slugs: string[] } {
  const byImage = new Map<string, LeonRawRow>();
  for (const r of leonRawRows) {
    if (r?.ok && r?.relevant && r.images?.[0]) byImage.set(r.images[0], r);
  }

  const productKeys = (p: Product) => {
    const stem = leonModelBaseKeyFromImageUrl(p.image, p.slug);
    const raw = byImage.get(p.image);
    const urlSlug = raw?.url ? pathSlugFromLeonUrl(raw.url) : null;
    return { stem, urlSlug };
  };

  const hits = new Set<Product>();
  const excelRows = loadExcelRows();

  for (const row of excelRows) {
    for (const p of leonProducts) {
      const { stem, urlSlug } = productKeys(p);
      if (
        brojMatch(row.broj, p, stem, byImage) ||
        nameMatch(row.naziv, stem, urlSlug) ||
        slugNameMatch(row.naziv, p, stem)
      ) {
        hits.add(p);
      }
    }
  }

  const expanded = new Set<Product>(hits);
  for (const p of hits) {
    if (!p.modelGroupId) continue;
    for (const sib of leonProducts) {
      if (sib.modelGroupId === p.modelGroupId) expanded.add(sib);
    }
  }

  const products = [...expanded];
  return {
    excelRowCount: excelRows.length,
    products,
    slugs: products.map((p) => p.slug).sort(),
  };
}
