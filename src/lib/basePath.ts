/** Base path for GitHub Pages project site (empty on Vercel). */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/** Prefix a root-absolute path with basePath when needed. */
export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!path.startsWith('/')) return path;
  if (!base) return path;
  if (path === '/') return `${base}/`;
  return `${base}${path}`;
}
