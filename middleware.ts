import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Vercel / Node hosting: `/` → `/de`.
 * Not used for GitHub Pages static export (middleware disabled during that build).
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
