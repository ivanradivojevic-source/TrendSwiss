/**
 * Excel lista (Tabela Cene.xlsx) → leon.rs Opis + Sastav lica / Podnožje / Đon
 * → description + specifications (de, fr, en, it).
 *
 *   npx tsx scripts/sync-excel-leon-content.ts
 *   npx tsx scripts/sync-excel-leon-content.ts --apply
 *   npx tsx scripts/sync-excel-leon-content.ts --apply --limit 20
 *
 * pip install deep-translator
 */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Product } from '../data/products';
import { leonProductsOnExcelList } from './excel-match-leon-products';
import {
  buildSpecificationRows,
  extractLeonProductContent,
} from './leon-extract-page-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_TS = join(ROOT, 'data', 'leon-products.generated.ts');
const REPORT_PATH = join(__dirname, 'leon-excel-content-sync-report.json');
const CACHE_PATH = join(__dirname, 'leon-site-sku-cache.json');
const LEON_RAW = join(ROOT, 'data', 'leon-products.raw.json');
const TRANSLATE_PY = join(__dirname, 'leon-translate-sr.py');
const TRANSLATE_CHUNK = 40;
const FETCH_DELAY_MS = 300;

type LeonCacheEntry = { url?: string; error?: string };
type LeonRawRow = { url?: string; images?: string[]; ok?: boolean; relevant?: boolean };

function loadLeonProducts(): Product[] {
  const src = readFileSync(OUT_TS, 'utf8');
  const m = src.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('leon-products.generated.ts parse failed');
  return JSON.parse(m[1]) as Product[];
}

function writeLeonProducts(products: Product[]) {
  writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — excel leon content sync ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function resolveLeonUrl(
  slug: string,
  product: Product,
  cache: Record<string, LeonCacheEntry>,
  byImage: Map<string, LeonRawRow>
): string | null {
  if (cache[slug]?.url) return cache[slug].url!;
  const raw = byImage.get(product.image);
  return raw?.url ?? null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      accept: 'text/html',
      'accept-language': 'sr,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function translateTexts(srTexts: string[]) {
  const unique = [...new Set(srTexts.filter(Boolean))];
  const map: Record<string, Record<'de' | 'fr' | 'en' | 'it', string>> = {};
  for (let i = 0; i < unique.length; i += TRANSLATE_CHUNK) {
    const chunk = unique.slice(i, i + TRANSLATE_CHUNK);
    const proc = spawnSync('python', [TRANSLATE_PY], {
      input: JSON.stringify({ texts: chunk }),
      encoding: 'utf8',
      maxBuffer: 80 * 1024 * 1024,
    });
    if (proc.status !== 0) {
      throw new Error(proc.stderr || proc.stdout || 'translate failed');
    }
    Object.assign(map, JSON.parse(proc.stdout || '{}'));
  }
  return map;
}

function sanitizeSr(text: string): string {
  return text.replace(/[\uD800-\uDFFF]/g, '').normalize('NFC').trim();
}

function localizedFromSr(
  map: Record<string, Record<'de' | 'fr' | 'en' | 'it', string>>,
  sr: string | null | undefined
) {
  if (!sr) return null;
  const t = map[sr];
  if (!t) return null;
  return { de: t.de, fr: t.fr, en: t.en, it: t.it };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0;

  try {
    execSync('python -c "import deep_translator"', { stdio: 'pipe' });
  } catch {
    console.error('Instaliraj: pip install deep-translator');
    process.exit(1);
  }

  const products = loadLeonProducts();
  const rawJson = JSON.parse(readFileSync(LEON_RAW, 'utf8')) as { raw?: LeonRawRow[] };
  const rawRows = rawJson.raw ?? [];
  const { excelRowCount, products: excelLeon, slugs: slugsAll } = leonProductsOnExcelList(
    products,
    rawRows
  );
  const targets = limit > 0 ? excelLeon.slice(0, limit) : excelLeon;
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Record<string, LeonCacheEntry>;
  const byImage = new Map<string, LeonRawRow>();
  for (const r of rawRows) {
    if (r?.ok && r?.relevant && r.images?.[0]) byImage.set(r.images[0], r);
  }
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const report = {
    startedAt: new Date().toISOString(),
    excelRows: excelRowCount,
    excelLeonProducts: slugsAll.length,
    processed: targets.length,
    apply,
    ok: [] as { slug: string; url: string; hasDescription: boolean; specCount: number }[],
    skipped: [] as { slug: string; reason: string; url?: string }[],
    failed: [] as { slug: string; url?: string; error: string }[],
  };

  console.log(
    `Excel redova: ${excelRowCount}, Leon proizvoda na listi: ${slugsAll.length}, obrađujem ${targets.length}, apply=${apply}`
  );

  const scraped = new Map<
    string,
    {
      url: string;
      description: string | null;
      specs: { sastavLica: string | null; podnozje: string | null; don: string | null };
    }
  >();

  for (let i = 0; i < targets.length; i++) {
    const p0 = targets[i];
    const slug = p0.slug;
    const url = resolveLeonUrl(slug, p0, cache, byImage);
    if (!url) {
      report.skipped.push({ slug, reason: 'no-leon-url' });
      continue;
    }

    process.stdout.write(`fetch [${i + 1}/${targets.length}] ${slug} … `);
    try {
      const html = await fetchHtml(url);
      const content = extractLeonProductContent(html);
      if (
        !content.description &&
        !content.specs.sastavLica &&
        !content.specs.podnozje &&
        !content.specs.don
      ) {
        report.skipped.push({ slug, url, reason: 'empty-leon-content' });
        console.log('prazno');
      } else {
        scraped.set(slug, {
          url,
          description: content.description ? sanitizeSr(content.description) : null,
          specs: {
            sastavLica: content.specs.sastavLica
              ? sanitizeSr(content.specs.sastavLica)
              : null,
            podnozje: content.specs.podnozje ? sanitizeSr(content.specs.podnozje) : null,
            don: content.specs.don ? sanitizeSr(content.specs.don) : null,
          },
        });
        console.log('ok');
      }
    } catch (e) {
      report.failed.push({ slug, url, error: String((e as Error)?.message ?? e) });
      console.log('FAIL', (e as Error)?.message ?? e);
    }
    await sleep(FETCH_DELAY_MS);
  }

  const allSr: string[] = [];
  for (const { description, specs } of scraped.values()) {
    if (description) allSr.push(description);
    if (specs.sastavLica) allSr.push(specs.sastavLica);
    if (specs.podnozje) allSr.push(specs.podnozje);
    if (specs.don) allSr.push(specs.don);
  }

  console.log(`Prevodim ${new Set(allSr).size} jedinstvenih tekstova…`);
  const trMap = translateTexts(allSr);

  for (const [slug, { url, description: descSr, specs }] of scraped) {
    const p = bySlug.get(slug)!;
    const description = descSr ? localizedFromSr(trMap, descSr) : null;
    const specValues = {
      sastavLica: localizedFromSr(trMap, specs.sastavLica),
      podnozje: localizedFromSr(trMap, specs.podnozje),
      don: localizedFromSr(trMap, specs.don),
    };
    const specifications = buildSpecificationRows(specs, specValues);

    if (description) p.description = description;
    if (specifications.length) p.specifications = specifications;

    report.ok.push({
      slug,
      url,
      hasDescription: Boolean(descSr),
      specCount: specifications.length,
    });
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    ok: report.ok.length,
    skipped: report.skipped.length,
    failed: report.failed.length,
  };
  writeFileSync(
    REPORT_PATH,
    JSON.stringify({ ...report, finishedAt, summary }, null, 2) + '\n',
    'utf8'
  );

  if (apply && report.ok.length) {
    writeLeonProducts(products);
    console.log(`Upisano ${report.ok.length} proizvoda.`);
  } else if (!apply) {
    console.log('Dry-run — pokreni sa --apply za upis u katalog.');
  }

  console.log('Izveštaj:', REPORT_PATH);
  console.log(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
