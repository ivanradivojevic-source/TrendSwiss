/**
 * Grace (1131): sizes 36–41 per leon.rs (no 42).
 * npx tsx scripts/patch-grace-1131.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'leon-site-sku-cache.json');

const GRACE_SLUGS = ['grace-bez', 'grace-zlatna', 'grace-braon'];
const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41'];

function loadLeonProducts() {
  const text = fs.readFileSync(OUT_TS, 'utf8');
  const m = text.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) throw new Error('Could not parse leonProducts');
  return JSON.parse(m[1]);
}

function writeLeonProducts(products) {
  fs.writeFileSync(
    OUT_TS,
    `/* AUTO-GENERATED — grace-1131 patch ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
    'utf8'
  );
}

function rebuildSizes(p) {
  const colors = p.colors ?? [
    { id: 'black', label: 'Schwarz', hex: '#111827' },
    { id: 'grey', label: 'Grau', hex: '#6b7280' },
    { id: 'white', label: 'Weiss', hex: '#f9fafb' },
  ];
  const skuBase = p.slug.replace(/-/g, '').toUpperCase().slice(0, 18);
  const price =
    p.variants?.find((v) => typeof v.priceCHF === 'number')?.priceCHF ??
    p.variants?.[0]?.priceCHF ??
    0;
  const sizes = WOMEN_SIZES.map((s) => ({
    id: s,
    label: { de: s, fr: s, en: s, it: s },
  }));
  const variants = sizes.flatMap((size) =>
    colors.map((c) => ({
      size: size.id,
      color: c.id,
      sku: `LEON-${skuBase}-${size.id}-${c.id}`,
      priceCHF: price,
      stock: 10,
    }))
  );
  return { ...p, articleNumber: '1131', sizes, colors, variants };
}

async function main() {
  for (const slug of GRACE_SLUGS) {
    const html = await fetch(`https://leon.rs/p/${slug}/`).then((r) => r.text());
    const fromVar = [...html.matchAll(/attribute_pa_dimenzije&quot;:&quot;(\d{2})/g)].map((m) => m[1]);
    console.log('leon.rs', slug, [...new Set(fromVar)].sort().join(','));
  }

  const products = loadLeonProducts();
  let fixed = 0;
  for (const slug of GRACE_SLUGS) {
    const p = products.find((x) => x.slug === slug);
    if (!p) {
      console.warn('Missing', slug);
      continue;
    }
    Object.assign(p, rebuildSizes(p));
    fixed++;
  }
  console.log('Grace 1131 sizes →', WOMEN_SIZES.join(','), 'fixed:', fixed);

  if (fs.existsSync(CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    for (const slug of GRACE_SLUGS) {
      if (cache[slug]) cache[slug].sizes = WOMEN_SIZES;
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }

  writeLeonProducts(products);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
