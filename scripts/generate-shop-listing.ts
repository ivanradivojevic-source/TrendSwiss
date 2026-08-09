/**
 * Writes public/shop-listing.json for CDN-cached shop grid.
 * Run: npx tsx scripts/generate-shop-listing.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getShopListing } from '../src/lib/shopListing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'shop-listing.json');

mkdirSync(dirname(outPath), { recursive: true });
const listing = getShopListing();
const json = JSON.stringify(listing);
writeFileSync(outPath, json);
console.log(
  `Wrote ${listing.length} items → ${outPath} (${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)`
);
