/**
 * Static export for GitHub Pages + custom domain (www.trendswiss.ch).
 * - No basePath (site served at domain root)
 * - Temporarily moves API/admin + middleware (unsupported in `output: 'export'`)
 * - Builds into `out/`, copies to `docs/`
 *
 * Usage: npm run build:pages
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  cpSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const CUSTOM_DOMAIN = 'www.trendswiss.ch';

const moves = [
  ['middleware.ts', 'middleware.ts.__pages_bak'],
  ['app/api', 'app/__api_pages_bak'],
  ['app/admin', 'app/__admin_pages_bak'],
];

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function stash() {
  for (const [from, to] of moves) {
    const src = join(root, from);
    const dest = join(root, to);
    if (existsSync(src)) {
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      renameSync(src, dest);
      console.log(`stashed ${from} → ${to}`);
    }
  }
}

function restore() {
  for (const [from, to] of moves) {
    const src = join(root, to);
    const dest = join(root, from);
    if (existsSync(src)) {
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      renameSync(src, dest);
      console.log(`restored ${to} → ${from}`);
    }
  }
}

try {
  stash();
  run('npx', ['tsx', 'scripts/generate-shop-listing.ts']);
  run('npx', ['tsx', 'scripts/generate-product-search-index.ts']);
  // Empty basePath = custom domain at site root (www.trendswiss.ch)
  run('npx', ['next', 'build'], {
    STATIC_EXPORT: '1',
    NEXT_PUBLIC_BASE_PATH: '',
  });

  const outDir = join(root, 'out');
  const docsDir = join(root, 'docs');
  if (!existsSync(outDir)) throw new Error('out/ missing after build');

  rmSync(docsDir, { recursive: true, force: true });
  mkdirSync(docsDir, { recursive: true });
  cpSync(outDir, docsDir, { recursive: true });

  writeFileSync(
    join(docsDir, 'index.html'),
    `<!DOCTYPE html><html lang="de"><head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="0; url=/de/"/>
<link rel="canonical" href="/de/"/>
<script>location.replace('/de/');</script>
<title>Trend Swiss</title>
</head><body><p><a href="/de/">Trend Swiss</a></p></body></html>
`
  );

  // GitHub Pages custom domain
  writeFileSync(join(docsDir, 'CNAME'), `${CUSTOM_DOMAIN}\n`);

  // Without this, Jekyll ignores `_next/` and the site loads without CSS/JS
  writeFileSync(join(docsDir, '.nojekyll'), '');

  console.log('GitHub Pages static site ready in docs/');
  console.log(`Custom domain: https://${CUSTOM_DOMAIN}`);
  console.log('Pages settings: branch main → /docs + Custom domain www.trendswiss.ch');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  restore();
}
