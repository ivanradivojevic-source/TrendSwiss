'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { categories } from '@/data/categories';
import type { CategoryId } from '@/data/categories';
import { exploreCategories } from '@/data/explore-categories';
import type { ExploreCategoryId } from '@/data/explore-categories';
import MobileFilterSheet from '@/components/MobileFilterSheet';
import ShopProductPagination from '@/components/ShopProductPagination';
import { paginateProducts, parseShopPage, parseShopPerPage } from '@/src/lib/shopPagination';
import {
  formatListingPrice,
  type Locale,
  type ShopListingItem,
} from '@/src/lib/shopListing';

type ShopCatalogProps = {
  locale: Locale;
};

export default function ShopCatalog({ locale }: ShopCatalogProps) {
  const t = useTranslations('shop');
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ShopListingItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/shop-listing.json`, { cache: 'force-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ShopListingItem[]>;
      })
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cat = searchParams.get('cat') ?? undefined;
  const cats = searchParams.get('cats') ?? undefined;
  const brand = searchParams.get('brand') ?? undefined;
  const pcats = searchParams.get('pcats') ?? undefined;
  const uncat = searchParams.get('uncat') ?? undefined;
  const perPageParam = searchParams.get('perPage') ?? undefined;
  const pageParam = searchParams.get('page') ?? undefined;

  const allCategoryIds = categories.map((c) => c.id);
  const parseCats = (value: string | undefined) => {
    if (!value) return [] as CategoryId[];
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.filter((p): p is CategoryId => (allCategoryIds as string[]).includes(p));
  };

  const selectedCats = useMemo(() => {
    const multi = parseCats(cats);
    if (multi.length) return Array.from(new Set(multi));
    if (cat && (allCategoryIds as string[]).includes(cat)) return [cat as CategoryId];
    return [] as CategoryId[];
  }, [cat, cats]);

  const selectedBrand = brand === 'leon' || brand === 'milami' ? brand : null;

  const allExploreIds = exploreCategories.map((c) => c.id);
  const parseExplore = (value: string | undefined) => {
    if (!value) return [] as ExploreCategoryId[];
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.filter((p): p is ExploreCategoryId => (allExploreIds as string[]).includes(p));
  };
  const selectedExplore = useMemo(
    () => Array.from(new Set(parseExplore(pcats))),
    [pcats]
  );
  const showUncategorized = uncat === '1';
  const perPage = parseShopPerPage(perPageParam);
  const requestedPage = parseShopPage(pageParam);

  const catalog = products ?? [];

  const uncategorizedCount = useMemo(
    () => catalog.filter((p) => p.uncategorized).length,
    [catalog]
  );

  const filtered = useMemo(() => {
    return catalog.filter((p) => {
      if (selectedCats.length && !selectedCats.includes(p.category)) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (showUncategorized) return p.uncategorized;
      if (selectedExplore.length) {
        if (!selectedExplore.some((id) => p.explore.includes(id))) return false;
      }
      return true;
    });
  }, [catalog, selectedCats, selectedBrand, showUncategorized, selectedExplore]);

  const pagination = paginateProducts(filtered, perPage, requestedPage);
  const visibleProducts = pagination.items;

  const buildFilterQuery = (
    nextCats: CategoryId[],
    nextBrand: 'leon' | 'milami' | null,
    nextExplore: ExploreCategoryId[],
    nextUncategorized = false
  ) => {
    const params = new URLSearchParams();
    if (nextCats.length) params.set('cats', nextCats.join(','));
    if (nextBrand) params.set('brand', nextBrand);
    if (!nextUncategorized && nextExplore.length) params.set('pcats', nextExplore.join(','));
    if (nextUncategorized) params.set('uncat', '1');
    if (perPage !== 20) params.set('perPage', perPage === 'all' ? 'all' : String(perPage));
    return params.toString();
  };

  const buildHref = (
    nextCats: CategoryId[],
    nextBrand: 'leon' | 'milami' | null,
    nextExplore: ExploreCategoryId[],
    nextUncategorized = false
  ) => {
    const qs = buildFilterQuery(nextCats, nextBrand, nextExplore, nextUncategorized);
    return `/${locale}/shop${qs ? `?${qs}` : ''}`;
  };

  const filterQuery = buildFilterQuery(
    selectedCats,
    selectedBrand,
    selectedExplore,
    showUncategorized
  );

  const toggleCat = (id: CategoryId) => {
    if (selectedCats.includes(id)) return selectedCats.filter((c) => c !== id);
    return [...selectedCats, id];
  };

  const toggleExplore = (id: ExploreCategoryId) => {
    if (selectedExplore.includes(id)) return selectedExplore.filter((c) => c !== id);
    return [...selectedExplore, id];
  };

  const filterPanel = (compact: boolean) => {
    const item = compact
      ? 'flex min-h-11 items-center gap-2 rounded-lg px-3 py-2'
      : 'flex min-h-12 items-center gap-2 rounded-xl px-4 py-3';
    const idle = compact
      ? 'text-neutral-700 hover:bg-red-50'
      : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100';
    const active = 'bg-red-600 text-white font-semibold';

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">{t('exploreFilterTitle')}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link
              href={buildHref(selectedCats, selectedBrand, [])}
              className={`${item} ${
                !showUncategorized && selectedExplore.length === 0 ? active : idle
              }`}
            >
              <span
                className={`h-4 w-4 rounded border ${
                  !showUncategorized && selectedExplore.length === 0
                    ? 'border-white bg-white/20'
                    : 'border-neutral-300 bg-white'
                }`}
                aria-hidden
              />
              {t('allProducts')}
            </Link>
            {exploreCategories.map((c) => (
              <Link
                key={c.id}
                href={buildHref(selectedCats, selectedBrand, toggleExplore(c.id), false)}
                className={`${item} ${
                  !showUncategorized && selectedExplore.includes(c.id) ? active : idle
                }`}
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded border ${
                    !showUncategorized && selectedExplore.includes(c.id)
                      ? 'border-white bg-white/20'
                      : 'border-neutral-300 bg-white'
                  }`}
                  aria-hidden
                >
                  {!showUncategorized && selectedExplore.includes(c.id) ? (
                    <span className="block h-2 w-2 rounded-sm bg-white" />
                  ) : null}
                </span>
                {c.label[locale]}
              </Link>
            ))}
            <Link
              href={
                showUncategorized
                  ? buildHref(selectedCats, selectedBrand, selectedExplore, false)
                  : buildHref(selectedCats, selectedBrand, [], true)
              }
              className={`${item} border ${
                showUncategorized
                  ? 'border-amber-500 bg-amber-500 text-white font-semibold'
                  : 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded border ${
                  showUncategorized ? 'border-white bg-white/20' : 'border-amber-400 bg-white'
                }`}
                aria-hidden
              >
                {showUncategorized ? <span className="block h-2 w-2 rounded-sm bg-white" /> : null}
              </span>
              {t('uncategorizedFilter', { count: uncategorizedCount })}
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-800">{t('categories')}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link
              href={buildHref([], selectedBrand, selectedExplore, showUncategorized)}
              className={`${item} ${selectedCats.length === 0 ? active : idle}`}
            >
              <span
                className={`h-4 w-4 rounded border ${
                  selectedCats.length === 0 ? 'border-white bg-white/20' : 'border-neutral-300 bg-white'
                }`}
                aria-hidden
              />
              {t('all')}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={buildHref(toggleCat(c.id), selectedBrand, selectedExplore, showUncategorized)}
                className={`${item} ${selectedCats.includes(c.id) ? active : idle}`}
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded border ${
                    selectedCats.includes(c.id)
                      ? 'border-white bg-white/20'
                      : 'border-neutral-300 bg-white'
                  }`}
                  aria-hidden
                >
                  {selectedCats.includes(c.id) ? (
                    <span className="block h-2 w-2 rounded-sm bg-white" />
                  ) : null}
                </span>
                {c.name[locale]}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-800">{t('brandTitle')}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link
              href={buildHref(selectedCats, null, selectedExplore, showUncategorized)}
              className={`${compact ? 'flex min-h-11 items-center rounded-lg px-3 py-2' : 'flex min-h-12 items-center rounded-xl px-4 py-3'} ${
                !selectedBrand ? active : idle
              }`}
            >
              {t('allBrands')}
            </Link>
            <Link
              href={buildHref(selectedCats, 'leon', selectedExplore)}
              className={`${compact ? 'flex min-h-11 items-center rounded-lg px-3 py-2' : 'flex min-h-12 items-center rounded-xl px-4 py-3'} ${
                selectedBrand === 'leon' ? active : idle
              }`}
            >
              Leon
            </Link>
            <Link
              href={buildHref(selectedCats, 'milami', selectedExplore, showUncategorized)}
              className={`${compact ? 'flex min-h-11 items-center rounded-lg px-3 py-2' : 'flex min-h-12 items-center rounded-xl px-4 py-3'} ${
                selectedBrand === 'milami' ? active : idle
              }`}
            >
              Milami
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 page-fade-in">
      <div className="rounded-2xl bg-red-50/80 px-6 py-8 ring-1 ring-red-200/50">
        <h1 className="text-center text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-2 text-center text-sm font-medium text-neutral-600">{t('categories')}</p>
      </div>

      <section className="mt-8">
        <h2 className="text-center text-xl font-bold text-neutral-900">{t('exploreByCategory')}</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {exploreCategories.map((c) => (
            <Link
              key={c.id}
              href={buildHref(selectedCats, selectedBrand, [c.id])}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-red-200/40 transition hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] bg-neutral-100">
                <Image
                  src={c.image}
                  alt={c.label[locale]}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="flex items-end justify-between gap-2">
                  <h3 className="text-base font-bold text-white drop-shadow">{c.label[locale]}</h3>
                  <span className="rounded-xl bg-white/95 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition group-hover:bg-red-600 group-hover:text-white">
                    {t('view')} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <MobileFilterSheet
        title={t('filtersTitle')}
        buttonLabel={t('openFilters')}
        closeLabel={t('close')}
      >
        {filterPanel(false)}
      </MobileFilterSheet>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px,1fr]">
        <aside className="hidden space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:block">
          {filterPanel(true)}
        </aside>

        <div>
          {loadError ? (
            <p className="text-center text-neutral-500">{t('noProductsInCategory')}</p>
          ) : products == null ? (
            <p className="py-16 text-center text-neutral-500">…</p>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${locale}/shop/${p.slug}`}
                    className="group overflow-hidden rounded-xl border-2 border-red-100 bg-white shadow-md transition hover:border-red-200 hover:shadow-lg"
                  >
                    <div className="aspect-square relative bg-neutral-100">
                      <Image
                        src={p.image}
                        alt={p.name[locale]}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-medium uppercase text-neutral-500">
                        {categories.find((c) => c.id === p.category)?.name[locale]}
                      </p>
                      <h2 className="mt-0.5 font-semibold text-neutral-900">{p.name[locale]}</h2>
                      {p.articleLine ? (
                        <p className="mt-0.5 font-mono text-xs font-medium text-neutral-500">
                          {t('sku')}: {p.articleLine}
                        </p>
                      ) : null}
                      {formatListingPrice(p, t('chf')) ? (
                        <p className="mt-1 font-medium text-red-600">
                          {formatListingPrice(p, t('chf'))}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>

              <ShopProductPagination
                locale={locale}
                baseQuery={filterQuery}
                perPage={perPage}
                page={pagination.page}
                totalPages={pagination.totalPages}
                from={pagination.from}
                to={pagination.to}
                total={pagination.total}
                labels={{
                  perPage: t('perPageLabel'),
                  per20: t('perPage20'),
                  per50: t('perPage50'),
                  perAll: t('perPageAll'),
                  showing: t('showingRange', {
                    from: pagination.from,
                    to: pagination.to,
                    total: pagination.total,
                  }),
                  prev: t('prevPage'),
                  next: t('nextPage'),
                  pageOf: t('pageOf', {
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                  }),
                }}
              />

              {filtered.length === 0 && (
                <p className="mt-10 text-center text-neutral-500">{t('noProductsInCategory')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
