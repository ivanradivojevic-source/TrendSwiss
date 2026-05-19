/**
 * Shop: samo Liora I (3 boje), 53 CHF; Liora II skrivena (nema Excel listu / cenu).
 * npx node scripts/patch-liora-shop.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');
const SLUGS_JSON = path.join(ROOT, 'data', 'excel-shop-slugs.json');

const LIORA_I = ['liora-zelena', 'liora-i-crna', 'liora-i-bela'];
const LIORA_II = ['liora-ii-zlatna', 'liora-ii-crna', 'liora-ii-bela'];
const PRICE = 53;

function patchBlock(src, slug, setPrice) {
  const anchor = `"slug": "${slug}"`;
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(`slug not found: ${slug}`);
  const next = src.indexOf('\n  },\n  {', start);
  const end = next < 0 ? src.length : next;
  let block = src.slice(start, end);
  if (setPrice === 53) {
    block = block.replace(/"priceCHF": null/g, '"priceCHF": 53');
  } else if (setPrice === null) {
    block = block.replace(/"priceCHF": 53/g, '"priceCHF": null');
    block = block.replace(/"priceCHF": 49\.9/g, '"priceCHF": null');
  }
  return src.slice(0, start) + block + src.slice(end);
}

let src = fs.readFileSync(OUT_TS, 'utf8');
for (const slug of LIORA_I) src = patchBlock(src, slug, PRICE);
for (const slug of LIORA_II) src = patchBlock(src, slug, null);
fs.writeFileSync(OUT_TS, src);

const slugs = JSON.parse(fs.readFileSync(SLUGS_JSON, 'utf8'));
const filtered = slugs.filter((s) => !LIORA_II.includes(s));
for (const s of LIORA_I) {
  if (!filtered.includes(s)) filtered.push(s);
}
filtered.sort();
fs.writeFileSync(SLUGS_JSON, JSON.stringify(filtered, null, 2) + '\n');

console.log('Liora I price 53:', LIORA_I.join(', '));
console.log('Removed from excel-shop-slugs:', LIORA_II.join(', '));
