const url = 'https://www.milami.rs/products/single/scarlett_blue';

const IMG_RE = /<img[^>]+(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi;
const SRCSET_RE = /srcset=["']([^"']+)["']/gi;

function pickSrcsetUrls(srcset: string) {
  return srcset
    .split(',')
    .map((x) => x.trim().split(' ')[0])
    .filter(Boolean);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function abs(u: string) {
  try {
    return new URL(u, url).href;
  } catch {
    return null;
  }
}

async function main() {
  const html = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  }).then((r) => r.text());

  const imgs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IMG_RE.exec(html))) imgs.push(m[1]);
  while ((m = SRCSET_RE.exec(html))) imgs.push(...pickSrcsetUrls(m[1]));

  const all = uniq(imgs.map(abs).filter(Boolean) as string[]);
  console.log('total', all.length);
  console.log(all.slice(0, 60).join('\n'));
  console.log('--- product-like ---');
  const productLike = all.filter((u) => /\/images\//.test(u) && !/(logo|slogan|icon|sprite)/i.test(u));
  console.log('productLike', productLike.length);
  console.log(productLike.slice(0, 60).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

