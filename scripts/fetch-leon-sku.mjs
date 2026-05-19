/** Shared SKU scrape from leon.rs product pages. */
export function extractSifra(html) {
  const patterns = [
    /class=["']sku-value["'][^>]*>\s*([A-Z0-9][A-Z0-9-]*)\s*</i,
    /SKU\s*:\s*<\/span>\s*<span[^>]*>\s*([A-Z0-9][A-Z0-9-]*)\s*</i,
    /Šifra\s+artikla\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
    /Sifra\s+artikla\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
    /SKU\s*:\s*([A-Z0-9][A-Z0-9-]*)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export function leonSlugFromUrl(url) {
  return url?.match(/\/p\/([^/]+)\/?$/i)?.[1]?.toLowerCase() ?? null;
}

/** Size options from leon.rs product page (attribute_pa_dimenzije). */
export function extractLeonSizes(html, opts = {}) {
  const min = opts.min ?? 20;
  const max = opts.max ?? 48;
  const sizes = new Set();
  for (const m of html.matchAll(/attribute_pa_dimenzije["']:?\s*["'](\d{2})/gi)) sizes.add(m[1]);
  for (const m of html.matchAll(/attribute_pa_dimenzije&quot;:&quot;(\d{2})/g)) sizes.add(m[1]);
  for (const m of html.matchAll(/<option[^>]+value="(\d{2})"/gi)) sizes.add(m[1]);
  for (const m of html.matchAll(/value=&quot;(\d{2})&quot;/g)) sizes.add(m[1]);
  const out = [...sizes]
    .filter((x) => /^\d{2}$/.test(x) && Number(x) >= min && Number(x) <= max)
    .sort((a, b) => Number(a) - Number(b));
  return out.length ? out : null;
}

export async function fetchLeonPageInfo(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'sr,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const sifra = extractSifra(html);
  let title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  title = title
    ? title
        .replace(/&#8211;/g, '–')
        .replace(/\s*[|–—]\s*Leon\s*$/i, '')
        .trim()
    : null;
  const colorLabel = title
    ? title
        .split(/\s*[–—]\s*/)
        .map((x) => x.trim())
        .filter(Boolean)
        .pop() ?? null
    : null;
  const sizes = extractLeonSizes(html);
  return { url, sifra, title, colorLabel, sizes };
}
