/**
 * Upisuje normalizeLeonImportedProducts u leon-products.generated.ts (trajno na disku).
 * npx tsx scripts/persist-leon-normalize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'leon-products.generated.ts');

async function main() {
  const { leonProducts } = await import('../data/leon-products.generated.ts');
  const { normalizeLeonImportedProducts } = await import('../data/leonCatalogNormalize.ts');
  const normalized = normalizeLeonImportedProducts(leonProducts);

  fs.writeFileSync(
    OUT,
    `/* AUTO-GENERATED — normalized ${new Date().toISOString().slice(0, 10)} */\n` +
      `export const leonProducts = ${JSON.stringify(normalized, null, 2)};\n`,
    'utf8'
  );

  const anchor = normalized.filter((p) => p.slug?.startsWith('anchor-'));
  console.log(
    'Anchor rows:',
    anchor.map((p) => ({ slug: p.slug, mg: p.modelGroupId, en: p.name?.en }))
  );
}

main();
