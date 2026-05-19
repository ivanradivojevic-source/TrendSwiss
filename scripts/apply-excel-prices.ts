/**
 * Read Tabela Cene.xlsx → match shop products → update priceCHF (Maloprodajna cena, CHF).
 *
 * Usage:
 *   npx tsx scripts/apply-excel-prices.ts           # dry-run + report
 *   npx tsx scripts/apply-excel-prices.ts --apply     # write catalog files
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Product } from '../data/products';
import { products } from '../data/products';
import { harborMensSandalProducts } from '../data/harbor-mens-sandals';
import { leonProducts } from '../data/leon-products.generated';
import { milamiProducts } from '../data/milami-products.generated';
import {
  leonModelBaseKeyFromImageUrl,
  leonModelGroupBaseFromLeonUrl,
} from '../data/leonCatalogNormalize';
import {
  normalizeLeonColorSlugKey,
  pathSlugFromLeonUrl,
  stripColorsFromPathSlug,
} from '../data/leonMultiLocale';
import leonRaw from '../data/leon-products.raw.json';

const EXCEL_PATH = String.raw`D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx`;
const REPORT_JSON = join(__dirname, 'excel-price-report.json');
const REPORT_MD = join(__dirname, 'excel-price-report.md');

type ExcelRow = {
  sheetRow?: number;
  velicine: string | null;
  redni: number | null;
  broj: string;
  naziv: string;
  nabavna: number | null;
  maloprodajna: number;
};

type LeonRawRow = {
  url?: string;
  name?: string;
  images?: string[];
  ok?: boolean;
  relevant?: boolean;
};

type MatchResult = {
  broj: string;
  naziv: string;
  maloprodajnaCHF: number;
  status: 'matched' | 'unmatched';
  matchMethod: string[];
  shopProducts: {
    id: string;
    slug: string;
    nameEn: string;
    category: string;
    modelGroupId?: string;
    stemKey: string | null;
    variantCount: number;
    oldPriceCHF: number | null;
    newPriceCHF: number;
  }[];
};

function loadExcelRows(): ExcelRow[] {
  const pyScript = join(__dirname, 'read-excel-prices.py');
  const raw = execSync(`python "${pyScript}" "${EXCEL_PATH}"`, { encoding: 'utf8' });
  const rows = JSON.parse(raw) as ExcelRow[];
  return rows.filter((r) => r.naziv && Number.isFinite(r.maloprodajna));
}

function normKey(s: string): string {
  return normalizeLeonColorSlugKey(s.replace(/\*/g, ''))
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const ROMAN_WORD: Record<string, string> = {
  '1': 'i',
  '2': 'ii',
  '3': 'iii',
  '4': 'iv',
  '5': 'v',
};

/** Excel naziv ↔ Leon CDN stem exceptions. */
const EXCEL_STEM_ALIASES: Record<string, string[]> = {
  siena2: ['siena-ii', 'siena-2'],
  siena1: ['siena-i', 'siena-1'],
  'nora-5': ['nora-iv', 'nora-v', 'nora-5'],
  rubikon: ['rubicon'],
  rubicon: ['rubicon'],
};

/** Excel "Andora 2" → andora-2, andora-ii */
function excelNameKeys(naziv: string): string[] {
  const keys = new Set<string>();
  const base = normKey(naziv);
  keys.add(base);

  const m = naziv.trim().match(/^(.+?)\s+(\d+)\s*$/);
  if (m) {
    const stem = normKey(m[1]);
    const num = m[2];
    keys.add(`${stem}-${num}`);
    const rw = ROMAN_WORD[num];
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
  const excelHasVariant = eKeys.some((k) => hasVariantSuffix(k));

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

  if (excelHasVariant) return false;

  // Excel without suffix: allow exact base stem only (not andora-ii for andora)
  const baseOnly = normKey(excelNaziv.split(/\s+\d/)[0] ?? excelNaziv);
  for (const pk of pKeys) {
    if (pk === baseOnly && !hasVariantSuffix(pk)) return true;
  }
  return false;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Broj artikla mora biti ceo segment u LEON kodu (ne podniz tipa 510 u DSC05510). */
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

/** Leon slug / image stem (e.g. siena-ii) ↔ Excel naziv. */
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

const byImage = new Map<string, LeonRawRow>();
for (const r of (leonRaw.raw as LeonRawRow[]) ?? []) {
  if (r?.ok && r?.relevant && r.images?.[0]) byImage.set(r.images[0], r);
}

function productKeys(p: Product): { stem: string | null; urlSlug: string | null } {
  const stem = leonModelBaseKeyFromImageUrl(p.image);
  const raw = byImage.get(p.image);
  const urlSlug = raw?.url ? pathSlugFromLeonUrl(raw.url) : null;
  return { stem, urlSlug };
}

function matchExcelRow(row: ExcelRow, catalog: Product[]): { products: Product[]; methods: string[] } {
  const methods: string[] = [];
  const hits = new Set<Product>();

  for (const p of catalog) {
    const { stem, urlSlug } = productKeys(p);
    if (brojMatch(row.broj, p, stem)) {
      hits.add(p);
      if (!methods.includes('broj')) methods.push('broj');
      continue;
    }
    if (nameMatch(row.naziv, stem, urlSlug)) {
      hits.add(p);
      if (!methods.includes('naziv')) methods.push('naziv');
      continue;
    }
    if (slugNameMatch(row.naziv, p, stem)) {
      hits.add(p);
      if (!methods.includes('slug')) methods.push('slug');
    }
  }

  // Expand colour variants via modelGroupId
  const expanded = new Set<Product>(hits);
  for (const p of hits) {
    if (p.modelGroupId) {
      for (const sib of catalog) {
        if (sib.modelGroupId === p.modelGroupId) expanded.add(sib);
      }
    }
  }

  return { products: [...expanded], methods };
}

function minPrice(p: Product): number | null {
  if (!p.variants.length) return null;
  return Math.min(...p.variants.map((v) => v.priceCHF));
}

function buildReport(rows: ExcelRow[]): MatchResult[] {
  return rows.map((row) => {
    const { products: matched, methods } = matchExcelRow(row, products);
    const shopProducts = matched.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameEn: p.name.en,
      category: p.category,
      modelGroupId: p.modelGroupId,
      stemKey: productKeys(p).stem,
      variantCount: p.variants.length,
      oldPriceCHF: minPrice(p),
      newPriceCHF: row.maloprodajna,
    }));

    return {
      broj: row.broj,
      naziv: row.naziv,
      maloprodajnaCHF: row.maloprodajna,
      status: matched.length ? ('matched' as const) : ('unmatched' as const),
      matchMethod: methods,
      shopProducts,
    };
  });
}

function applyPrices(report: MatchResult[], apply: boolean): { leonUpdated: number; milamiUpdated: number; harborUpdated: number } {
  const priceById = new Map<string, number>();
  const priceBySlug = new Map<string, number>();
  for (const r of report) {
    if (r.status !== 'matched') continue;
    for (const sp of r.shopProducts) {
      priceById.set(sp.id, r.maloprodajnaCHF);
      priceBySlug.set(sp.slug, r.maloprodajnaCHF);
    }
  }

  // Second pass: apply by slug to leon source rows (ids can differ after normalize)
  const leonListPre = leonProducts as unknown as Product[];
  for (const p of leonListPre) {
    const bySlug = priceBySlug.get(p.slug);
    if (bySlug != null) priceById.set(p.id, bySlug);
  }

  let leonUpdated = 0;
  let milamiUpdated = 0;
  let harborUpdated = 0;

  const leonList = leonProducts as unknown as Product[];
  const milamiList = milamiProducts as unknown as Product[];
  const harborList = harborMensSandalProducts as Product[];

  const excelRows = loadExcelRows();

  // Direct pass on leon source: match every Excel row to every Leon row (all colour slugs).
  for (const row of excelRows) {
    for (const p of leonList) {
      const { stem, urlSlug } = productKeys(p);
      const hit =
        brojMatch(row.broj, p, stem) ||
        nameMatch(row.naziv, stem, urlSlug) ||
        slugNameMatch(row.naziv, p, stem);
      if (!hit) continue;
      priceById.set(p.id, row.maloprodajna);
      priceBySlug.set(p.slug, row.maloprodajna);
    }
  }

  for (const p of leonList) {
    const price = priceById.get(p.id) ?? priceBySlug.get(p.slug);
    if (price == null) continue;
    for (const v of p.variants) {
      if (v.priceCHF !== price) leonUpdated++;
      v.priceCHF = price;
    }
  }
  for (const p of milamiList) {
    const price = priceById.get(p.id);
    if (price == null) continue;
    for (const v of p.variants) {
      if (v.priceCHF !== price) milamiUpdated++;
      v.priceCHF = price;
    }
  }
  for (const p of harborList) {
    const price = priceById.get(p.id);
    if (price == null) continue;
    for (const v of p.variants) {
      if (v.priceCHF !== price) harborUpdated++;
      v.priceCHF = price;
    }
  }

  if (!apply) return { leonUpdated, milamiUpdated, harborUpdated };

  writeFileSync(
    join(__dirname, '../data/leon-products.generated.ts'),
    `/* AUTO-GENERATED by scripts/leon-scrape-explore.mjs */\n// No type import here (generated file).\nexport const leonProducts = ${JSON.stringify(leonList, null, 2)};\n`,
    'utf8'
  );
  writeFileSync(
    join(__dirname, '../data/milami-products.generated.ts'),
    `/* AUTO-GENERATED by scripts/milami-scrape-catalog.mjs */\n` +
      `// No type import here (generated file).\n` +
      `export const milamiProducts = ${JSON.stringify(milamiList, null, 2)};\n`,
    'utf8'
  );

  // Harbor: patch constant in source file
  const harborPath = join(__dirname, '../data/harbor-mens-sandals.ts');
  let harborSrc = readFileSync(harborPath, 'utf8');
  const harborPrice = priceById.get('leon-harbor-braon') ?? priceById.get('leon-harbor-crna');
  if (harborPrice != null) {
    harborSrc = harborSrc.replace(/const priceCHF = [\d.]+;/, `const priceCHF = ${harborPrice};`);
    writeFileSync(harborPath, harborSrc, 'utf8');
  }

  return { leonUpdated, milamiUpdated, harborUpdated };
}

function writeMarkdown(report: MatchResult[]) {
  const matched = report.filter((r) => r.status === 'matched');
  const unmatched = report.filter((r) => r.status === 'unmatched');

  const lines: string[] = [
    '# Excel cene — izveštaj mapiranja',
    '',
    `Datum: ${new Date().toISOString().slice(0, 10)}`,
    `Izvor: \`Tabela Cene.xlsx\` (kolona **Maloprodajna cena**, CHF)`,
    '',
    `| Status | Broj redova |`,
    `|--------|-------------|`,
    `| Uspešno mapirano | ${matched.length} |`,
    `| Nije nađeno na sajtu | ${unmatched.length} |`,
    `| Ukupno u Excel-u | ${report.length} |`,
    '',
    '---',
    '',
    '## Mapirano (proveri ručno)',
    '',
  ];

  for (const r of matched) {
    lines.push(`### ${r.naziv} (broj: ${r.broj}) → **${r.maloprodajnaCHF} CHF**`);
    lines.push(`- Način: ${r.matchMethod.join(', ') || '—'}`);
    lines.push(`- Shop proizvoda (boje/slug): ${r.shopProducts.length}`);
    for (const sp of r.shopProducts) {
      const old = sp.oldPriceCHF != null ? sp.oldPriceCHF.toFixed(2) : '?';
      lines.push(
        `  - \`${sp.slug}\` — ${sp.nameEn} (${sp.category}) · ${old} → ${sp.newPriceCHF.toFixed(2)} CHF · stem: ${sp.stemKey ?? '—'}`
      );
    }
    lines.push('');
  }

  lines.push('---', '', '## Nije mapirano (nema na sajtu ili treba ručna mapa)', '');

  for (const r of unmatched) {
    lines.push(`- **${r.naziv}** (broj: ${r.broj}) — ${r.maloprodajnaCHF} CHF`);
  }

  writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
}

function main() {
  const apply = process.argv.includes('--apply');
  const rows = loadExcelRows();
  const report = buildReport(rows);
  writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8');
  writeMarkdown(report);

  const matched = report.filter((r) => r.status === 'matched').length;
  const unmatched = report.filter((r) => r.status === 'unmatched').length;

  const stats = applyPrices(report, apply);

  console.log(`Excel redova: ${rows.length}`);
  console.log(`Mapirano: ${matched}, nije nađeno: ${unmatched}`);
  console.log(`Izveštaj: ${REPORT_JSON}`);
  console.log(`Izveštaj: ${REPORT_MD}`);
  if (apply) {
    console.log('Primena:', stats);
  } else {
    console.log('Dry-run (bez upisa). Pokreni sa --apply za upis u katalog.');
  }
}

main();
