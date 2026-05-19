/**
 * Import specific leon.rs URLs with Excel price + broj filter on CDN images.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const JOBS = [
  {
    naziv: 'Flow',
    broj: '500',
    priceCHF: 47,
    urls: [
      'https://leon.rs/p/flow-zelena-perlato/',
      'https://leon.rs/p/flow-crna/',
      'https://leon.rs/p/flow-bela/',
      'https://leon.rs/p/flow-perla/',
    ],
    modelGroupId: 'leon-mg-flow-500',
  },
  {
    naziv: 'Line',
    broj: '510',
    priceCHF: 49,
    urls: [
      'https://leon.rs/p/line-zelena/',
      'https://leon.rs/p/line-braon/',
      'https://leon.rs/p/line-siva/',
      'https://leon.rs/p/line-crna/',
    ],
    modelGroupId: 'leon-mg-line-510',
  },
  {
    naziv: 'Linea',
    broj: '8001',
    priceCHF: 59,
    urls: [
      'https://leon.rs/p/linea-bez/',
      'https://leon.rs/p/linea-zlatna/',
      'https://leon.rs/p/liena-braon/',
    ],
    modelGroupId: 'leon-mg-linea-8001',
  },
  {
    naziv: 'Siena2',
    broj: '7011',
    priceCHF: 69,
    urls: [
      'https://leon.rs/p/siena-ii-zlatna/',
      'https://leon.rs/p/siena-ii-crna/',
    ],
    modelGroupId: 'leon-mg-siena-ii-7011',
  },
  {
    naziv: 'Rubikon',
    broj: '3500',
    priceCHF: 49,
    urls: [
      'https://leon.rs/p/rubicon-teget-bakkar/',
      'https://leon.rs/p/rubicon-crna-bakkar/',
      'https://leon.rs/p/rubicon-bela-bakkar/',
    ],
    modelGroupId: 'leon-mg-rubicon-3500',
  },
];

// Reuse minimal scrape from leon-import-missing.mjs
const FETCH_TIMEOUT_MS = 25000;

function decodeHtml(s) {
  return s.replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
}
function cleanTitle(raw) {
  return decodeHtml(raw)
    .replace(/\s*[|–—]\s*Leon\s*$/i, '')
    .trim();
}
function abortableFetch(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: c.signal, headers: { 'user-agent': 'TrendSwissShopBot/0.1' } }).finally(() =>
    clearTimeout(t)
  );
}
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {}
  }
  return out;
}
function extractMeta(html, key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1];
}
function inferGender(html) {
  const l = html.toLowerCase();
  if (l.includes('decije')) return 'children';
  if (l.includes('muske') || l.includes('muska')) return 'men';
  return 'women';
}
function imageHasBroj(images, broj, html = '') {
  const b = broj.toLowerCase();
  if (html && new RegExp(`SKU:\\s*${b}\\b`, 'i').test(html)) return true;
  return images.some((u) => {
    const parts = u.toLowerCase().split(/[-_/]/);
    return parts.includes(b) || u.toLowerCase().includes(`/${b}-`) || u.toLowerCase().includes(`-${b}-`);
  });
}
async function scrape(url) {
  const res = await abortableFetch(url);
  const html = await res.text();
  scrape._lastHtml = html;
  const ld = extractJsonLd(html);
  let name = ld.flatMap((x) => (Array.isArray(x) ? x : [x])).find((x) => x?.['@type'] === 'Product')?.name;
  if (!name) name = extractMeta(html, 'og:title') || 'Leon';
  const images = [
    ...[...html.matchAll(/https:\/\/cdn\.leon\.rs\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
      (m) => m[0]
    ),
  ];
  const uniq = [...new Set(images)].filter((u) => !u.includes('favicon') && !u.includes('logo.png'));
  const pathSlug = url.match(/\/p\/([^/]+)\//)?.[1];
  return { url, name: cleanTitle(String(name)), images: uniq.slice(0, 6), pathSlug, genderCategory: inferGender(html) };
}
function toProduct(row, priceCHF, modelGroupId) {
  const sizes =
    row.genderCategory === 'children'
      ? ['28', '30', '32', '34']
      : row.genderCategory === 'men'
        ? ['41', '42', '43', '44', '45', '46', '47']
        : ['36', '37', '38', '39', '40', '41', '42'];
  const colors = [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const skuBase = row.pathSlug.replace(/-/g, '').toUpperCase().slice(0, 18);
  return {
    id: `leon-${row.pathSlug}`,
    slug: row.pathSlug,
    category: row.genderCategory,
    brand: 'leon',
    modelGroupId,
    name: { de: row.name, fr: row.name, en: row.name, it: row.name },
    description: {
      de: `Modell „${row.name}“.`,
      fr: `Modèle « ${row.name} ».`,
      en: `Model "${row.name}".`,
      it: `Modello «${row.name}».`,
    },
    image: row.images[0],
    images: row.images,
    sizes: sizes.map((s) => ({ id: s, label: { de: s, fr: s, en: s, it: s } })),
    colors,
    variants: sizes.flatMap((size) =>
      colors.map((c) => ({
        size,
        color: c.id,
        sku: `LEON-${skuBase}-${size}-${c.id}`,
        priceCHF,
        stock: 10,
      }))
    ),
  };
}

function load() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  return JSON.parse(text.match(/export const leonProducts = (\[[\s\S]*\]);/)[1]);
}

const products = load();
const slugs = new Set(products.map((p) => p.slug));
const log = [];

for (const job of JOBS) {
  let added = 0;
  for (const url of job.urls) {
    try {
      const row = await scrape(url);
      const html = scrape._lastHtml || '';
      if (!imageHasBroj(row.images, job.broj, html) && job.broj.length >= 3) {
        log.push({ job: job.naziv, url, skip: 'broj_not_in_images' });
        continue;
      }
      if (slugs.has(row.pathSlug)) {
        log.push({ job: job.naziv, url, skip: 'exists' });
        continue;
      }
      products.push(toProduct(row, job.priceCHF, job.modelGroupId));
      slugs.add(row.pathSlug);
      added++;
    } catch (e) {
      log.push({ job: job.naziv, url, error: e.message });
    }
  }
  log.push({ job: job.naziv, added });
  console.log(job.naziv, '+', added);
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED by scripts/leon-scrape-explore.mjs + imports */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);
fs.writeFileSync(path.join(ROOT, 'scripts', 'leon-targeted-import-log.json'), JSON.stringify(log, null, 2));
console.log('Total products:', products.length);
