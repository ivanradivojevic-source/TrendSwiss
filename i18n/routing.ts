import { defineRouting } from 'next-intl/routing';

/**
 * Active UI locales — add/remove here; LocaleSwitcher follows this list.
 * Keep messages/*.json even if a locale is temporarily disabled.
 */
export const routing = defineRouting({
  locales: ['de', 'fr', 'en', 'it'],
  defaultLocale: 'de',
  localePrefix: 'always',
  localeDetection: false,
});

/** Not used while all locales are active. Kept for optional temporary disables. */
export const DISABLED_LOCALES = [] as const;
