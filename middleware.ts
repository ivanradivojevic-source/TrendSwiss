import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DISABLED_LOCALES } from './i18n/routing';

/**
 * - `/` → `/de`
 * - `/fr|/en|/it/...` → `/de/...` (disabled locales; easy to re-enable via routing.locales)
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  const first = pathname.split('/').filter(Boolean)[0];
  if (first && (DISABLED_LOCALES as readonly string[]).includes(first)) {
    const rest = pathname.slice(first.length + 1); // '' or '/shop/...'
    const url = request.nextUrl.clone();
    url.pathname = `/de${rest}` || '/de';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/(fr|en|it)', '/(fr|en|it)/:path*'],
};
