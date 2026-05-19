/**
 * Map old Swiss placeholder slugs → current leon.rs slugs (by matching primary image).
 * npx tsx scripts/build-leon-slug-redirects.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'leon-slug-redirects.json');
const CURRENT_TS = path.join(ROOT, 'data', 'leon-products.generated.ts');

function parseLeonProducts(tsText) {
  const m = tsText.match(/export const leonProducts = (\[[\s\S]*\]);/);
  if (!m) return [];
  return JSON.parse(m[1]);
}

function loadCurrent() {
  return parseLeonProducts(fs.readFileSync(CURRENT_TS, 'utf8'));
}

function loadGitHead() {
  try {
    const text = execSync('git show HEAD:data/leon-products.generated.ts', {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return parseLeonProducts(text);
  } catch {
    return [];
  }
}

function main() {
  const current = loadCurrent();
  const old = loadGitHead();
  const imageToSlug = new Map(current.map((p) => [p.image, p.slug]));

  const redirects = {};
  for (const p of old) {
    const next = imageToSlug.get(p.image);
    if (next && next !== p.slug) redirects[p.slug] = next;
  }

  fs.writeFileSync(OUT, JSON.stringify(redirects, null, 2) + '\n', 'utf8');
  console.log('Redirects:', Object.keys(redirects).length);
  console.log('Example:', redirects['bern-classic'], redirects['zurich-everyday']);
}

main();
