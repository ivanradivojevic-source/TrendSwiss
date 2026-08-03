import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Minimal middleware: only redirect `/` → `/de`.
 * Locale pages use setRequestLocale (static), so next-intl Edge middleware
 * is not needed on every shop/PDP hit (saves invocations + CPU).
 */
export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/de', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
