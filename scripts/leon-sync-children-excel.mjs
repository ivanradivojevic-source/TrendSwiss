/**
 * Sync all Leon children's models from Tabela Cene.xlsx with leon.rs:
 * - discover colour variants on leon.rs
 * - import missing rows
 * - sizes exactly as on leon.rs (order preserved)
 *
 * Run: npx tsx scripts/leon-sync-children-excel.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLeonPageInfo, leonSlugFromUrl } from './fetch-leon-sku.mjs';
import {
  LEON_EXCEL_CHILDREN_ARTICLES,
  rebuildProductSizes,
} from './leon-size-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');
const REPORT_PATH = path.join(ROOT, 'scripts', 'leon-children-excel-sync-report.json');

const DELAY_MS = 280;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Seed URLs + search term per Excel article (leon.rs). */
const EXCEL_CHILDREN_JOBS = [
  {
    broj: '500',
    naziv: 'Flow',
    priceCHF: 47,
    search: 'Flow',
    seedUrls: [
      'https://leon.rs/p/flow-zelena-perlato/',
      'https://leon.rs/p/flow-crna/',
      'https://leon.rs/p/flow-bela/',
      'https://leon.rs/p/flow-perla/',
    ],
    modelGroupId: 'leon-mg-flow-500-children',
  },
  {
    broj: '510',
    naziv: 'Line',
    priceCHF: 49,
    search: 'Line',
    seedUrls: [
      'https://leon.rs/p/line-zelena/',
      'https://leon.rs/p/line-braon/',
      'https://leon.rs/p/line-siva/',
      'https://leon.rs/p/line-crna/',
    ],
    modelGroupId: 'leon-mg-line-510-children',
  },
  {
    broj: '4800',
    naziv: 'Olaf',
    priceCHF: 49,
    search: 'Olaf',
    seedUrls: ['https://leon.rs/p/olaf-teget/', 'https://leon.rs/p/olaf-perla/'],
    modelGroupId: 'leon-mg-olaf-4800-children',
  },
  {
    broj: '4810',
    naziv: 'Nino',
    priceCHF: 49,
    search: 'Nino',
    seedUrls: [
      'https://leon.rs/p/nino-siva/',
      'https://leon.rs/p/nino-braon/',
      'https://leon.rs/p/nino-roze/',
    ],
    modelGroupId: 'leon-mg-nino-4810-children',
  },
  {
    broj: '4811',
    naziv: 'Stella',
    priceCHF: 49,
    search: 'Stella I',
    seedUrls: ['https://leon.rs/p/stella-i-zlatna/', 'https://leon.rs/p/stella-i-roze/'],
    modelGroupId: 'leon-mg-stella-4811-children',
  },
  {
    broj: '4812',
    naziv: 'Stella II',
    priceCHF: 49,
    search: 'Stella II',
    seedUrls: ['https://leon.rs/p/stella-ii-zlatna/', 'https://leon.rs/p/stella-ii-roze/'],
    modelGroupId: 'leon-mg-stella-4812-children',
  },
  {
    broj: '4813',
    naziv: 'Elio',
    priceCHF: 49,
    search: 'Elio',
    seedUrls: [
      'https://leon.rs/p/elio-zlatna/',
      'https://leon.rs/p/elio-teget/',
      'https://leon.rs/p/elio-zelena/',
      'https://leon.rs/p/elio-siva/',
      'https://leon.rs/p/elio-roze/',
    ],
    modelGroupId: 'leon-mg-elio-4813-children',
  },
];

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function writeLeonProducts(products) {
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — leon-sync-children-excel ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function loadExcelChildrenRows() {
  const py = path.join(ROOT, 'scripts', 'read-excel-prices.py');
  const raw = execSync(`python "${py}"`, { encoding: 'utf8' });
  const rows = JSON.parse(raw);
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!LEON_EXCEL_CHILDREN_ARTICLES.has(r.broj)) continue;
    const k = r.broj;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

async function searchLeonSlugs(query) {
  const url = `https://leon.rs/?s=${encodeURIComponent(query)}&post_type=product`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return [];
  const html = await res.text();
  return [...new Set([...html.matchAll(/leon\.rs\/p\/([a-z0-9-]+)\//gi)].map((m) => m[1].toLowerCase()))];
}

function stemFromUrl(url) {
  return url?.match(/\/([^/]+?)\.(?:jpg|jpeg|png|webp)/i)?.[1] ?? '';
}

function filterGalleryByPrimary(primaryUrl, urls) {
  const family = stemFromUrl(primaryUrl).replace(/\d+$/i, '').replace(/_$/i, '');
  if (!family) return urls.slice(0, 8);
  const kept = urls.filter((u) => {
    const s = stemFromUrl(u).replace(/\d+$/i, '').replace(/_$/i, '');
    return s === family;
  });
  return [...new Set([primaryUrl, ...kept.filter((u) => u !== primaryUrl)])];
}

async function scrapeGallery(url, broj, colorToken) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (broj && colorToken) {
    const esc = colorToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (broj === '4800') {
      const olafRe = new RegExp(
        `https://cdn\\.leon\\.rs/wp-content/uploads/[^"'\\s>]+/Olaf-${esc}(?:-(\\d+))?\\.(?:jpg|jpeg|png|webp)`,
        'gi'
      );
      const byIndex = new Map();
      for (const m of html.matchAll(olafRe)) {
        byIndex.set(m[1] ? Number(m[1]) : 0, m[0]);
      }
      const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, u]) => u);
      if (ordered.length) return ordered;
    }
    const re = new RegExp(
      `https://cdn\\.leon\\.rs/wp-content/uploads/[^"'\\s>]+/${broj}-${esc}-velur(\\d+)\\.(?:jpg|jpeg|png|webp)`,
      'gi'
    );
    const byIndex = new Map();
    for (const m of html.matchAll(re)) {
      byIndex.set(Number(m[1]), m[0]);
    }
    const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, u]) => u);
    if (ordered.length) return ordered;
  }
  const all = [
    ...new Set(
      [...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0]
      )
    ),
  ].filter((u) => !/favicon|logo\.png/i.test(u));
  const primary = all.find((u) => /velur1\.|1\.jpg/i.test(u)) || all[0];
  return filterGalleryByPrimary(primary, all);
}

function makeDefaultColors() {
  return [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
}

function buildProduct({ slug, title, images, sizes, priceCHF, broj, modelGroupId }) {
  const colors = makeDefaultColors();
  const displayName = title || slug;
  const baseName = displayName.split('–')[0]?.trim() || displayName;
  const row = {
    id: `leon-${slug}`,
    slug,
    category: 'children',
    brand: 'leon',
    modelGroupId,
    articleNumber: broj,
    name: { de: displayName, fr: displayName, en: displayName, it: displayName },
    description: {
      de: `Kindermodell „${baseName}“.`,
      fr: `Modèle enfant « ${baseName} ».`,
      en: `Kids' model "${baseName}".`,
      it: `Modello per bambini «${baseName}».`,
    },
    image: images[0],
    images: images.length > 1 ? images : undefined,
    colors,
    variants: [{ priceCHF, stock: 10 }],
  };
  Object.assign(row, rebuildProductSizes(row, sizes));
  for (const v of row.variants) v.priceCHF = priceCHF;
  return row;
}

async function discoverUrlsForJob(job) {
  const slugs = new Set(job.seedUrls.map((u) => leonSlugFromUrl(u)).filter(Boolean));
  for (const q of [job.search, job.naziv, job.broj]) {
    if (!q) continue;
    const found = await searchLeonSlugs(q);
    await sleep(DELAY_MS);
    for (const s of found) slugs.add(s);
  }
  const verified = [];
  for (const slug of slugs) {
    const url = `https://leon.rs/p/${slug}/`;
    try {
      const info = await fetchLeonPageInfo(url);
      await sleep(DELAY_MS);
      if (info.sifra !== job.broj) continue;
      if (!info.sizes?.length) {
        console.warn('  No sizes on page:', slug);
        continue;
      }
      verified.push({ slug, url, ...info });
    } catch (e) {
      console.warn('  Skip', slug, e?.message);
    }
  }
  return verified;
}

async function main() {
  const excelRows = loadExcelChildrenRows();
  console.log('Excel children articles:', excelRows.map((r) => `${r.broj} ${r.naziv} (${r.velicine || '?'})`).join(', '));

  const products = loadLeonProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};

  const report = { syncedAt: new Date().toISOString(), models: [] };

  for (const job of EXCEL_CHILDREN_JOBS) {
    const excel = excelRows.find((r) => r.broj === job.broj);
    const priceCHF = excel?.maloprodajna ?? job.priceCHF;
    console.log(`\n=== ${job.naziv} (${job.broj}) CHF ${priceCHF} ===`);

    const variants = await discoverUrlsForJob(job);
    console.log(`  Found ${variants.length} colour(s) on leon.rs`);

    const modelReport = { broj: job.broj, naziv: job.naziv, colors: [] };
    let added = 0;
    let updated = 0;

    for (const v of variants) {
      let images = [];
      try {
        const colorToken =
          v.colorLabel ||
          v.title?.split(/[–—]/).pop()?.trim() ||
          v.slug.split('-').pop();
        images = await scrapeGallery(v.url, job.broj, colorToken);
        await sleep(DELAY_MS);
      } catch {
        images = [];
      }

      cache[v.slug] = {
        url: v.url,
        sifra: v.sifra,
        title: v.title,
        colorLabel: v.colorLabel,
        sizes: v.sizes,
        fetchedAt: new Date().toISOString(),
      };

      const existing = bySlug.get(v.slug);
      if (existing) {
        existing.category = 'children';
        existing.articleNumber = job.broj;
        existing.modelGroupId = job.modelGroupId;
        Object.assign(existing, rebuildProductSizes(existing, v.sizes));
        for (const variant of existing.variants ?? []) {
          variant.priceCHF = priceCHF;
        }
        if (images[0]) {
          existing.image = images[0];
          if (images.length > 1) existing.images = images;
        }
        if (v.title) {
          existing.name = { de: v.title, fr: v.title, en: v.title, it: v.title };
        }
        updated++;
      } else {
        const row = buildProduct({
          slug: v.slug,
          title: v.title,
          images: images.length ? images : ['https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80'],
          sizes: v.sizes,
          priceCHF,
          broj: job.broj,
          modelGroupId: job.modelGroupId,
        });
        products.push(row);
        bySlug.set(v.slug, row);
        added++;
      }

      modelReport.colors.push({
        slug: v.slug,
        sizes: v.sizes,
        url: v.url,
      });
      console.log(`  ${v.slug}: ${v.sizes.join(',')}`);
    }

    modelReport.added = added;
    modelReport.updated = updated;
    report.models.push(modelReport);
  }

  writeLeonProducts(products);
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('\n=== DONE ===');
  console.log('Report:', REPORT_PATH);
  console.log('Total Leon products:', products.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
