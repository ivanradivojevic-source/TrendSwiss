'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, startTransition } from 'react';
import { markSearchNav } from '@/src/lib/searchNavFlag';
import type { Locale } from '@/data/products';
import searchIndexData from '@/data/product-search-index.json';
import {
  searchProductIndex,
  type ProductSearchHit,
  type ProductSearchIndexEntry,
} from '@/src/lib/productSearchClient';

const searchIndex = searchIndexData as ProductSearchIndexEntry[];

export default function GlobalProductSearch() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const trimmedQuery = query.trim();

  const hits = useMemo(
    () => (trimmedQuery ? searchProductIndex(trimmedQuery, searchIndex, locale, 8) : []),
    [trimmedQuery, locale]
  );

  useEffect(() => {
    startTransition(() => {
      setOpen(focused && hits.length > 0);
      setActiveIndex(-1);
    });
  }, [hits, focused]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? hits[activeIndex] : hits[0];
      if (target) {
        markSearchNav();
        setOpen(false);
        setQuery('');
        setFocused(false);
        router.push(`/${locale}/shop/${encodeURIComponent(target.slug)}`);
      }
    }
  };

  const showNoResults = focused && trimmedQuery.length >= 1 && hits.length === 0;

  return (
    <div ref={rootRef} className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {t('searchLabel')}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          inputMode="search"
          enterKeyHint="go"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (trimmedQuery && hits.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? `${listId}-listbox` : undefined}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-10 text-base text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/25"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={t('searchClear')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {open && hits.length > 0 ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-[60] mt-1 max-h-[min(20rem,70vh)] w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {hits.map((hit, i) => (
            <li key={hit.slug} role="option" aria-selected={i === activeIndex}>
              <Link
                href={`/${locale}/shop/${hit.slug}`}
                prefetch={false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  markSearchNav();
                  setOpen(false);
                  setQuery('');
                  setFocused(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 transition ${
                  i === activeIndex ? 'bg-red-50' : 'hover:bg-neutral-50'
                }`}
              >
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hit.image}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">{hit.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-neutral-500">
                    {hit.articleNumber ? (
                      <span className="font-mono font-semibold text-neutral-700">{hit.articleNumber}</span>
                    ) : null}
                    {hit.priceLabel ? (
                      <span className="font-medium text-red-600">{hit.priceLabel}</span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {showNoResults ? (
        <p className="absolute z-[60] mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-500 shadow-lg">
          {t('searchNoResults')}
        </p>
      ) : null}
    </div>
  );
}
