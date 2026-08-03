import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

/**
 * Tight matcher: only real app routes.
 * Skips bot junk (/wp-admin, /wordpress, random paths, etc.)
 * that previously hit middleware on every request and burned invocations/CPU.
 */
export const config = {
  matcher: [
    '/',
    '/(de|fr|en|it)',
    '/(de|fr|en|it)/shop/:path*',
    '/(de|fr|en|it)/cart',
    '/(de|fr|en|it)/cart/:path*',
    '/(de|fr|en|it)/checkout/:path*',
  ],
};
