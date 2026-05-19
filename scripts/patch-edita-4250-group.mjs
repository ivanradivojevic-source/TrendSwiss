/**
 * Edita 4250: 10 boja u jednoj grupi (kao leon.rs/p/edita-bela/).
 * npx tsx scripts/patch-edita-4250-group.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

const GROUP_4250 = 'leon-mg-edita-4250-women';
const GROUP_CRAZY = 'leon-mg-edita-crazy-women';

const SLUGS_4250 = new Set([
  'edita-bela',
  'edita-crna',
  'edita-mint',
  'edita-perla',
  'edita-sampanj',
  'edita-teget',
  'edita-zelena-perlato',
  'edita-orlando-bez',
  'edita-orlando-braon',
  'edita-orlando-roza',
]);

const SLUGS_CRAZY = new Set([
  'edita-crazy-bez',
  'edita-crazy-braon-dark',
  'edita-crazy-crna',
  'edita-crazy-maslinasto-zelena',
  'edita-crazy-roze',
  'edita-crazy-siva',
]);

const text = fs.readFileSync(OUT_TS, 'utf8');
const products = JSON.parse(text.match(/export const leonProducts = (\[[\s\S]*\]);/)[1]);

for (const p of products) {
  if (SLUGS_4250.has(p.slug)) {
    p.modelGroupId = GROUP_4250;
    p.articleNumber = '4250';
  } else if (SLUGS_CRAZY.has(p.slug)) {
    p.modelGroupId = GROUP_CRAZY;
    p.articleNumber = '4250';
  }
}

fs.writeFileSync(
  OUT_TS,
  `/* AUTO-GENERATED — edita-4250-group ${new Date().toISOString().slice(0, 10)} */\n` +
    `export const leonProducts = ${JSON.stringify(products, null, 2)};\n`,
  'utf8'
);

console.log(
  '4250 group',
  products.filter((p) => p.modelGroupId === GROUP_4250).map((p) => p.slug).join(', ')
);
