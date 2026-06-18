'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import LocaleSwitcher from './LocaleSwitcher';
import BagIcon from './BagIcon';
import GlobalProductSearch from './GlobalProductSearch';
import { useState, useEffect } from 'react';

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const lines = useCartStore((s) => s.lines);
  const cartCount = lines.reduce((acc, l) => acc + l.quantity, 0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const base = `/${locale}`;
  const isHome = pathname === base || pathname === `${base}/`;

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `${base}#${id}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 overflow-x-hidden shadow-md transition-shadow duration-300">
      {/* Tanak tamno sivi trak – pri skrolu providan */}
      <div
        className={`h-1 w-full transition-colors duration-300 ${scrolled ? 'bg-[var(--header-dark)]/75' : 'bg-[var(--header-dark)]'}`}
        aria-hidden
      />
      {/* Glavni header – pri skrolu providan + blur */}
      <div
        className={`border-b border-neutral-200 transition-all duration-300 ${
          scrolled
            ? 'bg-white/75 backdrop-blur-md supports-[backdrop-filter]:bg-white/70'
            : 'bg-gradient-to-r from-white via-white to-[#fdf2f4]'
        }`}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="flex min-h-[4.75rem] items-center justify-between gap-2 py-2 sm:min-h-[7.25rem] sm:gap-3 md:min-h-[9rem] md:gap-4">
            <Link
              href={`${base}`}
              className="group flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:gap-4 md:flex-shrink-0 md:flex-none"
            >
              <Image
                src="/logo-icon.png"
                alt="Trend Swiss"
                width={928}
                height={598}
                className="brand-logo-3d-img h-12 w-auto max-w-[40%] flex-shrink-0 object-contain sm:h-20 sm:max-w-none md:h-[9.25rem] lg:h-[9.75rem]"
                priority
                unoptimized
              />
              <span className="brand-text-3d flex min-w-0 flex-1 flex-col leading-none">
                <span className="brand-title-3d truncate text-lg font-extrabold tracking-tight text-[var(--header-dark)] sm:text-3xl sm:whitespace-normal md:text-4xl lg:text-5xl">
                  Trend <span className="brand-title-swiss-3d text-red-600">Swiss</span>
                </span>
                <span className="brand-subtitle-3d mt-1 hidden text-xs font-medium text-neutral-500 sm:mt-1.5 sm:inline sm:text-sm">
                  trendswiss.ch
                </span>
              </span>
            </Link>

            <nav className="hidden flex-shrink-0 items-center gap-1 md:flex">
              <Link
                href={`${base}`}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-base font-medium text-[var(--header-dark)] transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {t('home')}
              </Link>
              <Link
                href={`${base}/shop`}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-base font-semibold text-red-600 transition hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <BagIcon size={20} className="flex-shrink-0" />
                {t('shop')}
              </Link>
              <Link
                href={`${base}#about`}
                onClick={scrollTo('about')}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-base font-medium text-[var(--header-dark)] transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {t('about')}
              </Link>
              <Link
                href={`${base}#contact`}
                onClick={scrollTo('contact')}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-base font-medium text-[var(--header-dark)] transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {t('contact')}
              </Link>
            </nav>

            <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 md:mr-2">
              <LocaleSwitcher />
              <a
                href={`${base}/cart`}
                className="relative flex items-center gap-1.5 rounded-lg bg-[var(--header-dark)] px-2.5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
                aria-label={t('cart')}
              >
                <BagIcon size={20} className="flex-shrink-0" />
                <span className="hidden sm:inline">{t('cart')}</span>
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </a>
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Mobile"
          >
            <Link
              href={`${base}`}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--header-dark)] transition hover:bg-neutral-100"
            >
              {t('home')}
            </Link>
            <Link
              href={`${base}/shop`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <BagIcon size={16} className="flex-shrink-0" />
              {t('shop')}
            </Link>
            <Link
              href={`${base}#about`}
              onClick={scrollTo('about')}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--header-dark)] transition hover:bg-neutral-100"
            >
              {t('about')}
            </Link>
            <Link
              href={`${base}#contact`}
              onClick={scrollTo('contact')}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--header-dark)] transition hover:bg-neutral-100"
            >
              {t('contact')}
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-3 pb-3 sm:px-4">
          <GlobalProductSearch />
        </div>
      </div>
    </header>
  );
}
