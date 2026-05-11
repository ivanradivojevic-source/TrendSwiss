'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import FlagIcon from './FlagIcon';

const locales = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
] as const;

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/').filter(Boolean);
    segments[0] = newLocale;
    router.push('/' + segments.join('/'));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-neutral-100"
        aria-label="Change language"
      >
        <FlagIcon code={current.code} size={22} />
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
                  <FlagIcon code={l.code} size={24} />
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
