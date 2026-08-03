import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'fr', 'en', 'it'],
  defaultLocale: 'de',
  localePrefix: 'always',
  // Avoid Accept-Language / cookie redirects (extra Edge hits from bots & first visits).
  localeDetection: false,
});
