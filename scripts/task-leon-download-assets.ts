import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const BASE_URL = 'https://task.leon.rs/';
const OUT_DIR = path.resolve(process.cwd(), 'downloads', 'task-leon');

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function isSameOrigin(url: string) {
  try {
    return new URL(url).origin === new URL(BASE_URL).origin;
  } catch {
    return false;
  }
}

function looksLikeAsset(url: string) {
  return /\.(png|jpe?g|webp)(\?|#|$)/i.test(url);
}

async function extractUrls(page: Page) {
  return await page.evaluate(() => {
    const urls: string[] = [];
    const push = (u: string | null | undefined) => {
      if (!u) return;
      urls.push(u);
    };

    document.querySelectorAll('a[href]').forEach((a) => push((a as HTMLAnchorElement).href));
    document.querySelectorAll('img[src]').forEach((img) => push((img as HTMLImageElement).src));
    document.querySelectorAll('source[srcset]').forEach((s) => push((s as HTMLSourceElement).srcset));
    return urls;
  });
}

async function main() {
  const email = requiredEnv('TASK_LEON_EMAIL');
  const password = requiredEnv('TASK_LEON_PASSWORD');

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(email).catch(async () => {
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  });
  await page.getByLabel(/lozinka|password/i).fill(password).catch(async () => {
    await page.locator('input[type="password"]').first().fill(password);
  });
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.getByRole('button', { name: /prijavite|prijava|sign in|login/i }).click().catch(async () => {
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
    }),
  ]);

  // Crawl a bit inside the portal and download all discovered image assets.
  const seenPages = new Set<string>();
  const seenAssets = new Set<string>();
  const queue: string[] = [page.url()];

  const MAX_PAGES = Number(process.env.TASK_LEON_MAX_PAGES || '60');

  while (queue.length && seenPages.size < MAX_PAGES) {
    const url = queue.shift()!;
    if (seenPages.has(url)) continue;
    seenPages.add(url);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch {
      continue;
    }

    const rawUrls = await extractUrls(page);
    for (const u of rawUrls) {
      // srcset can contain multiple urls; split naively by commas/spaces
      const parts = u.split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean);
      for (const part of parts) {
        if (isSameOrigin(part) && !seenPages.has(part)) queue.push(part);
        if (looksLikeAsset(part)) seenAssets.add(part);
      }
    }
  }

  const assets = Array.from(seenAssets);
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ baseUrl: BASE_URL, pages: [...seenPages], assets }, null, 2), 'utf8');

  // Download assets
  let i = 0;
  for (const assetUrl of assets) {
    i++;
    const u = new URL(assetUrl);
    const filename = `${String(i).padStart(5, '0')}-${path.basename(u.pathname).slice(0, 120) || 'asset'}`;
    const outPath = path.join(OUT_DIR, filename);
    try {
      const res = await context.request.get(assetUrl);
      if (!res.ok()) continue;
      const buf = await res.body();
      await writeFile(outPath, buf);
    } catch {
      // ignore individual failures
    }
  }

  await browser.close();

  // eslint-disable-next-line no-console
  console.log(`Done. Pages crawled: ${seenPages.size}. Assets found: ${assets.length}. Downloaded to: ${OUT_DIR}`);
  // eslint-disable-next-line no-console
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

