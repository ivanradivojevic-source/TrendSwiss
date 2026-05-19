/**
 * Leon.rs size defaults — women's papuce/sandale are 36–41 (no 42 on site).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXCEL_SIZES_JSON = path.join(ROOT, 'data', 'excel-article-sizes-from-sheet.json');

/** Kolona A (Veličine) iz Tabela Cene.xlsx — npr. "36-41", "35-42", "41-48". */
export function parseExcelVelicineToSizeIds(velicine) {
  if (velicine == null) return null;
  const raw = String(velicine)
    .trim()
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, '');
  if (!raw) return null;
  const range = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    let a = Number(range[1]);
    let b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const out = [];
    if (a <= b) for (let i = a; i <= b; i++) out.push(String(i));
    else for (let i = a; i >= b; i--) out.push(String(i));
    return out;
  }
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter((x) => /^\d{1,2}$/.test(x))
      .map((x) => String(Number(x)));
  }
  return null;
}

let excelArticleSizesFromSheet = {};
try {
  if (fs.existsSync(EXCEL_SIZES_JSON)) {
    excelArticleSizesFromSheet = JSON.parse(fs.readFileSync(EXCEL_SIZES_JSON, 'utf8'));
  }
} catch {
  excelArticleSizesFromSheet = {};
}
export const LEON_WOMEN_PAPUCE_SANDALE_SIZES = ['36', '37', '38', '39', '40', '41'];
export const LEON_WOMEN_DEFAULT_SIZES = ['36', '37', '38', '39', '40', '41', '42'];

/** Models where leon.rs still offers size 42 (exception to papuce/sandale 36–41 rule). */
export const LEON_CHILDREN_SIZES_22_34 = [
  '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
];

/** Leon children's models listed in Tabela Cene.xlsx (velicine column). */
export const LEON_EXCEL_CHILDREN_ARTICLES = new Set([
  '500',
  '510',
  '4800',
  '4810',
  '4811',
  '4812',
  '4813',
]);

export function isExcelChildrenArticle(articleNumber) {
  return LEON_EXCEL_CHILDREN_ARTICLES.has(String(articleNumber ?? '').trim());
}

export const LEON_ARTICLE_SIZE_OVERRIDES = {
  '4307': ['36', '37', '38', '39', '40', '41', '42'],
  '937': ['36', '37', '38', '39', '40', '41', '42'],
  'PU100': ['36', '37', '38', '39', '40', '41', '42'],
  '3300': ['36', '37', '38', '39', '40', '41'],
  '3500': ['36', '37', '38', '39', '40', '41'],
  'V202': ['36', '37', '38', '39', '40', '41'],
  'V200': ['36', '37', '38', '39', '40', '41'],
  '2022': ['36', '37', '38', '39', '40', '41'],
  '2019': ['36', '37', '38', '39', '40', '41'],
  '4700': ['42', '43', '44', '45', '46', '47', '48', '49'],
  '4700M': ['42', '43', '44', '45', '46', '47', '48', '49'],
  '4701M': ['42', '43', '44', '45', '46', '47', '48', '49'],
  '4703M': ['42', '43', '44', '45', '46', '47', '48', '49'],
  '4705M': ['42', '43', '44', '45', '46', '47', '48', '49'],
  '700M': ['42', '43', '44', '45', '46', '47', '48'],
  'V230M': ['41', '42', '43', '44', '45', '46'],
  '300M': ['41', '42', '43', '44', '45', '46', '47', '48'],
  '707M': ['41', '42', '43', '44', '45', '46', '47', '48'],
  'V200M': ['41', '42', '43', '44', '45', '46'],
  'V202M': ['41', '42', '43', '44', '45', '46'],
  'PU100M': ['41', '42', '43', '44', '45', '46', '47'],
};

export function sizesForArticle(articleNumber) {
  if (!articleNumber) return null;
  const key = String(articleNumber).trim();
  const fromSheet = excelArticleSizesFromSheet[key];
  if (Array.isArray(fromSheet) && fromSheet.length) return [...fromSheet];
  return LEON_ARTICLE_SIZE_OVERRIDES[key] ?? null;
}

function slugFromRow(r) {
  if (r.pathSlug) return r.pathSlug;
  const m = r.url?.match(/\/p\/([^/]+)\/?$/i);
  return m?.[1] ?? null;
}

export function isWomenPapuceOrSandaleRow(row) {
  const crumbs = (row.crumbs ?? []).join(' ').toLowerCase();
  const tags = (row.exploreTags ?? []).join(' ').toLowerCase();
  const gender = (row.genderCategory ?? row.category ?? '').toLowerCase();

  const isWomen =
    gender === 'women' ||
    /zenske-papuce|zenske-sandale|zenske-klompe/.test(crumbs);
  if (!isWomen) return false;

  const isKlompe =
    /\/klompe\//.test(crumbs) ||
    /zenske-klompe/.test(crumbs) ||
    (tags.includes('klompe') && !tags.includes('papuce') && !tags.includes('sandale'));

  const isPapuce =
    /\/papuce\//.test(crumbs) || /zenske-papuce/.test(crumbs) || tags.includes('papuce');

  const isSandale =
    /\/sandale\//.test(crumbs) || /zenske-sandale/.test(crumbs) || tags.includes('sandale');

  if (isKlompe && !isPapuce && !isSandale) return false;
  return isPapuce || isSandale;
}

export function leonDefaultSizes(genderCategory, meta = {}) {
  const cat = (genderCategory ?? 'women').toLowerCase();
  if (cat === 'children') {
    return ['28', '30', '32', '34'];
  }
  if (cat === 'men') return ['41', '42', '43', '44', '45', '46', '47'];
  const broj = meta.excelBroj ?? meta.articleNumber;
  const override = sizesForArticle(broj);
  if (override) return [...override];
  if (isWomenPapuceOrSandaleRow(meta)) return [...LEON_WOMEN_PAPUCE_SANDALE_SIZES];
  return [...LEON_WOMEN_DEFAULT_SIZES];
}

export function buildPapuceSandaleSlugSet(rootDir) {
  const slugs = new Set();
  const files = [
    path.join(rootDir, 'data', 'leon-products.raw.json'),
    path.join(rootDir, 'data', 'leon-missing-import.raw.json'),
  ];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const rows = Array.isArray(data) ? data : data.raw ?? data.newRaw ?? [];
    for (const r of rows) {
      if (!isWomenPapuceOrSandaleRow(r)) continue;
      const slug = slugFromRow(r);
      if (slug) slugs.add(slug);
    }
  }
  return slugs;
}

export function rebuildProductSizes(p, sizeIds) {
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
  const sizes = sizeIds.map((s) => ({
    id: s,
    label: { de: s, fr: s, en: s, it: s },
  }));
  const variants = sizeIds.flatMap((size) =>
    colors.map((c) => ({
      size,
      color: c.id,
      sku: `LEON-${skuBase}-${size}-${c.id}`,
      priceCHF: price,
      stock: 10,
    }))
  );
  return { sizes, colors, variants };
}
