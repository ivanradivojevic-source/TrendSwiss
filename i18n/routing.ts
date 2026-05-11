import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'fr', 'en', 'it'],
  defaultLocale: 'de',
  localePrefix: 'always',
});
