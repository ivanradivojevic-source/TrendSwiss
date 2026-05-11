'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import LocaleSwitcher from './LocaleSwitcher';
import BagIcon from './BagIcon';
import { useState, useEffect } from 'react';

export default function Header() {
  const t = useTranslations('nav');
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

  const base = pathname.split('/').slice(0, 2).join('/') || '/de';
  const isHome = pathname === base || pathname === base + '/';

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `${base}#${id}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-md transition-shadow duration-300">
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
        <div className="mx-auto flex min-h-[5.25rem] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[6.5rem]">
          <Link
            href={`${base}`}
            className="flex items-center gap-3 sm:gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <div className="relative h-16 w-16 flex-shrink-0 sm:h-24 sm:w-24 md:h-28 md:w-28">
              <Image
                src="/logo.png"
                alt="Trend Swiss Shop"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold text-[var(--header-dark)] sm:text-2xl md:text-3xl">
              TREND SWISS <span className="text-red-600">SHOP</span>
              <span className="ml-1.5 block text-xs font-normal text-neutral-500 sm:inline sm:text-sm">trendswiss.ch</span>
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

          <div className="flex flex-shrink-0 items-center gap-2 mr-4 md:mr-6">
            <LocaleSwitcher />
            {/* Use full navigation to avoid chunk/cache mismatch errors during rapid rebuilds. */}
            <a
              href={`${base}/cart`}
              className="relative flex items-center gap-2 rounded-lg bg-[var(--header-dark)] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <BagIcon size={20} className="flex-shrink-0" />
              {t('cart')}
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
