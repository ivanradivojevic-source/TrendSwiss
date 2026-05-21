import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import type { CategoryId } from '@/data/categories';
import { exploreCategories } from '@/data/explore-categories';
import type { ExploreCategoryId } from '@/data/explore-categories';
import { getExploreCategoriesForProduct, isUncategorizedProduct } from '@/src/lib/exploreClassifier';
import { formatArticleLine } from '@/src/lib/productArticle';
import { formatProductPriceLabel, productHasPrice } from '@/src/lib/productPrice';
import MobileFilterSheet from '@/components/MobileFilterSheet';

export const dynamic = 'force-dynamic';

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; cats?: string; brand?: string; pcats?: string; uncat?: string }>;
}) {
  const { locale } = await params;
  const { cat, cats, brand, pcats, uncat } = await searchParams;
  const t = await getTranslations('shop');
  const loc = locale as 'de' | 'fr' | 'en' | 'it';

  const allCategoryIds = categories.map((c) => c.id);
  const parseCats = (value: string | undefined) => {
    if (!value) return [] as CategoryId[];
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.filter((p): p is CategoryId => (allCategoryIds as string[]).includes(p));
  };

  // Back-compat: `cat` (single) still works; `cats` enables multi-select.
  const selectedCats = (() => {
    const multi = parseCats(cats);
    if (multi.length) return Array.from(new Set(multi));
    if (cat && (allCategoryIds as string[]).includes(cat)) return [cat as CategoryId];
    return [] as CategoryId[];
  })();

  const selectedBrand = brand === 'leon' || brand === 'milami' ? (brand as 'leon' | 'milami') : null;

  const allExploreIds = exploreCategories.map((c) => c.id);
  const parseExplore = (value: string | undefined) => {
    if (!value) return [] as ExploreCategoryId[];
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.filter((p): p is ExploreCategoryId => (allExploreIds as string[]).includes(p));
  };
  const selectedExplore = Array.from(new Set(parseExplore(pcats)));
  const showUncategorized = uncat === '1';

  const pricedProducts = products.filter(productHasPrice);
  const uncategorizedCount = pricedProducts.filter(isUncategorizedProduct).length;

  const filtered = pricedProducts.filter((p) => {
    if (selectedCats.length && !selectedCats.includes(p.category)) return false;
    if (selectedBrand && p.brand !== selectedBrand) return false;
    if (showUncategorized) return isUncategorizedProduct(p);
    if (selectedExplore.length) {
      const tags = getExploreCategoriesForProduct(p);
      if (!selectedExplore.some((id) => tags.includes(id))) return false;
    }
    return true;
  });

  const buildHref = (
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
    const qs = params.toString();
    return `/${locale}/shop${qs ? `?${qs}` : ''}`;
  };

  const toggleCat = (id: CategoryId) => {
    if (selectedCats.includes(id)) return selectedCats.filter((c) => c !== id);
    return [...selectedCats, id];
  };

  const toggleExplore = (id: ExploreCategoryId) => {
    if (selectedExplore.includes(id)) return selectedExplore.filter((c) => c !== id);
    return [...selectedExplore, id];
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 page-fade-in">
      <div className="rounded-2xl bg-red-50/80 px-6 py-8 ring-1 ring-red-200/50">
        <h1 className="text-center text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-2 text-center text-sm font-medium text-neutral-600">{t('categories')}</p>
      </div>

      {/* Explore by category (Leon-like) */}
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
                  alt={c.label[loc]}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="flex items-end justify-between gap-2">
                  <h3 className="text-base font-bold text-white drop-shadow">{c.label[loc]}</h3>
                  <span className="rounded-xl bg-white/95 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition group-hover:bg-red-600 group-hover:text-white">
                    {t('view')} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/*
        Mobile: filters open in a bottom sheet.
        Desktop: filters stay in the left sidebar.
      */}
      <MobileFilterSheet
        title={t('filtersTitle')}
        buttonLabel={t('openFilters')}
        closeLabel={t('close')}
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">{t('exploreFilterTitle')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link
                href={buildHref(selectedCats, selectedBrand, [])}
                className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 ${
                  !showUncategorized && selectedExplore.length === 0
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
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
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 ${
                    !showUncategorized && selectedExplore.includes(c.id)
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
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
                  {c.label[loc]}
                </Link>
              ))}
              <Link
                href={
                  showUncategorized
                    ? buildHref(selectedCats, selectedBrand, selectedExplore, false)
                    : buildHref(selectedCats, selectedBrand, [], true)
                }
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-4 py-3 ${
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
                className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 ${
                  selectedCats.length === 0
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
                }`}
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
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 ${
                    selectedCats.includes(c.id)
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded border ${
                      selectedCats.includes(c.id) ? 'border-white bg-white/20' : 'border-neutral-300 bg-white'
                    }`}
                    aria-hidden
                  >
                    {selectedCats.includes(c.id) ? <span className="block h-2 w-2 rounded-sm bg-white" /> : null}
                  </span>
                  {c.name[loc]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-neutral-800">{t('brandTitle')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link
                href={buildHref(selectedCats, null, selectedExplore, showUncategorized)}
                className={`flex min-h-12 items-center rounded-xl px-4 py-3 ${
                  !selectedBrand ? 'bg-red-600 text-white font-semibold' : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                {t('allBrands')}
              </Link>
              <Link
                href={buildHref(selectedCats, 'leon', selectedExplore)}
                className={`flex min-h-12 items-center rounded-xl px-4 py-3 ${
                  selectedBrand === 'leon'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                Leon
              </Link>
              <Link
                href={buildHref(selectedCats, 'milami', selectedExplore, showUncategorized)}
                className={`flex min-h-12 items-center rounded-xl px-4 py-3 ${
                  selectedBrand === 'milami'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                Milami
              </Link>
            </div>
          </div>
        </div>
      </MobileFilterSheet>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px,1fr]">
        <aside className="hidden lg:block space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">{t('exploreFilterTitle')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link
                href={buildHref(selectedCats, selectedBrand, [])}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 ${
                  !showUncategorized && selectedExplore.length === 0
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-700 hover:bg-red-50'
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
                  className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 ${
                    !showUncategorized && selectedExplore.includes(c.id)
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-red-50'
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
                  {c.label[loc]}
                </Link>
              ))}
              <Link
                href={
                  showUncategorized
                    ? buildHref(selectedCats, selectedBrand, selectedExplore, false)
                    : buildHref(selectedCats, selectedBrand, [], true)
                }
                className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 ${
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
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 ${
                  selectedCats.length === 0
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-700 hover:bg-red-50'
                }`}
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
                  className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 ${
                    selectedCats.includes(c.id)
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-red-50'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded border ${
                      selectedCats.includes(c.id) ? 'border-white bg-white/20' : 'border-neutral-300 bg-white'
                    }`}
                    aria-hidden
                  >
                    {selectedCats.includes(c.id) ? (
                      <span className="block h-2 w-2 rounded-sm bg-white" />
                    ) : null}
                  </span>
                  {c.name[loc]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-neutral-800">{t('brandTitle')}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link
                href={buildHref(selectedCats, null, selectedExplore, showUncategorized)}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 ${
                  !selectedBrand ? 'bg-red-600 text-white font-semibold' : 'text-neutral-700 hover:bg-red-50'
                }`}
              >
                {t('allBrands')}
              </Link>
              <Link
                href={buildHref(selectedCats, 'leon', selectedExplore)}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 ${
                  selectedBrand === 'leon'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-700 hover:bg-red-50'
                }`}
              >
                Leon
              </Link>
              <Link
                href={buildHref(selectedCats, 'milami', selectedExplore, showUncategorized)}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 ${
                  selectedBrand === 'milami'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'text-neutral-700 hover:bg-red-50'
                }`}
              >
                Milami
              </Link>
            </div>
          </div>
        </aside>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/shop/${p.slug}`}
              className="group overflow-hidden rounded-xl border-2 border-red-100 bg-white shadow-md transition hover:border-red-200 hover:shadow-lg"
            >
              <div className="aspect-square relative bg-neutral-100">
                <Image
                  src={p.image}
                  alt={p.name[loc]}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-medium uppercase text-neutral-500">
                  {categories.find((c) => c.id === p.category)?.name[loc]}
                </p>
                <h2 className="mt-0.5 font-semibold text-neutral-900">{p.name[loc]}</h2>
                {formatArticleLine(p) ? (
                  <p className="mt-0.5 font-mono text-xs font-medium text-neutral-500">
                    {t('sku')}: {formatArticleLine(p)}
                  </p>
                ) : null}
                {formatProductPriceLabel(p, t('chf')) ? (
                  <p className="mt-1 font-medium text-red-600">
                    {formatProductPriceLabel(p, t('chf'))}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">{t('noProductsInCategory')}</p>
      )}
    </div>
  );
}
