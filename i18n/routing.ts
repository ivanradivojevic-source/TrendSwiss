import { defineRouting } from 'next-intl/routing';

/**
 * Active UI locales.
 * To restore languages later, put them back here, e.g.:
 *   locales: ['de', 'fr', 'en', 'it'],
 * and clear/update DISABLED_LOCALES below.
 * LocaleSwitcher and static paths follow routing.locales automatically.
 * Keep messages/*.json and LocalizedString fields — do not delete them.
 */
export const routing = defineRouting({
  locales: ['de'],
  defaultLocale: 'de',
  localePrefix: 'always',
  localeDetection: false,
});

/** Locales that used to be public — middleware redirects them to /de/... */
export const DISABLED_LOCALES = ['fr', 'en', 'it'] as const;
