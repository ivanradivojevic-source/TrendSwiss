'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import FlagIcon from './FlagIcon';
import { routing } from '@/i18n/routing';

const localeMeta = {
  de: { label: 'Deutsch' },
  fr: { label: 'Français' },
  en: { label: 'English' },
  it: { label: 'Italiano' },
} as const;

/** Built from routing.locales — when you re-add fr/en/it there, the switcher returns. */
const locales = routing.locales.map((code) => ({
  code,
  label: localeMeta[code as keyof typeof localeMeta]?.label ?? code,
}));

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Single-locale mode: hide switcher (restore languages via i18n/routing.ts).
  if (locales.length <= 1) return null;

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const pathSegments =
      segments[0] === locale ? segments.slice(1) : segments;
    const suffix = pathSegments.length ? `/${pathSegments.join('/')}` : '';
    router.push(`/${newLocale}${suffix}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 hover:bg-neutral-100 sm:gap-2 sm:px-3"
        aria-label="Change language"
      >
        <FlagIcon code={current.code as 'de' | 'fr' | 'en' | 'it'} size={22} />
        <span className="hidden text-sm font-medium text-neutral-600 sm:inline">
          {current.label}
        </span>
        <span className="text-neutral-400 text-xs">▼</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg"
            role="listbox"
          >
            {locales.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => switchLocale(l.code)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-neutral-700 hover:bg-red-50 hover:text-neutral-900"
                  role="option"
                  aria-selected={locale === l.code}
                >
                  <FlagIcon code={l.code as 'de' | 'fr' | 'en' | 'it'} size={24} />
                  <span className="font-medium">{l.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
