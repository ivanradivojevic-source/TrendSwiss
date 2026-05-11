import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { categories } from '@/data/categories';
import { exploreCategories } from '@/data/explore-categories';
import ShopFlyButton from '@/components/ShopFlyButton';

const HOME_CATEGORY_IMAGES: Record<'women' | 'men' | 'children', string> = {
  women: 'https://cdn.leon.rs/wp-content/uploads/2025/10/050-Roze1.jpg',
  men: 'https://cdn.leon.rs/wp-content/uploads/2026/02/300M-bela1.jpg',
  children: 'https://cdn.leon.rs/wp-content/uploads/2025/11/4870-Ciklama1.jpg',
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const tNav = await getTranslations('nav');
  const tShop = await getTranslations('shop');
  const loc = locale as 'de' | 'fr' | 'en' | 'it';

  return (
    <div>
      {/* Hero – logo iste veličine, manje praznog prostora oko njega */}
      <section className="bg-gradient-to-b from-red-50 to-red-100/80 py-6 px-4 sm:py-8 md:py-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center [mix-blend-mode:darken]">
            <div className="relative h-40 w-40 sm:h-52 sm:w-52 md:h-64 md:w-64">
              <Image
                src="/logo.png"
                alt="TrendSwiss Shop"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 640px) 160px, (max-width: 768px) 208px, 256px"
              />
            </div>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-neutral-900 sm:text-4xl md:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-3 text-lg text-neutral-700">{t('heroSubtitle')}</p>
          {/* Dugme Shop – crna krila kao u logu, pri kliku poleti pa prebaci na shop */}
          <div className="mt-10">
            <ShopFlyButton href={`/${locale}/shop`}>
              <span className="text-lg">{tNav('shop')}</span>
            </ShopFlyButton>
          </div>
        </div>
      </section>

      {/* Tamno siva linija kao na vrhu */}
      <div className="h-1 w-full bg-[var(--header-dark)]" aria-hidden />

      {/* Kategorien (Explore by category) */}
      <section className="border-t-2 border-red-600/10 bg-red-50/60 py-12 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900">{tShop('categories')}</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => {
              const img = HOME_CATEGORY_IMAGES[c.id] ?? '/logo.png';
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/shop?cats=${c.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-red-200/40 transition hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    <Image
                      src={img}
                      alt={c.name[loc]}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white drop-shadow">{c.name[loc]}</h3>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition group-hover:bg-red-600 group-hover:text-white">
                        Pogledaj
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About us */}
      <section id="about" className="scroll-mt-20 border-t-2 border-red-600/10 bg-white py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-neutral-900">{t('aboutTitle')}</h2>
          <p className="mt-4 text-neutral-600">{t('aboutText')}</p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t border-neutral-200 bg-neutral-100 py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-neutral-900">{t('contactTitle')}</h2>
          <div className="mt-8 space-y-4 text-left inline-block">
            <p>
              <span className="font-medium text-neutral-700">{t('contactPhone')}:</span>{' '}
              <a href="tel:+41123456789" className="text-red-600 hover:underline">
                +41 12 345 67 89
              </a>
            </p>
            <p>
              <span className="font-medium text-neutral-700">{t('contactAddress')}:</span>{' '}
              <span className="text-neutral-600">
                Musterstrasse 1, 8000 Zürich, Schweiz
              </span>
            </p>
            <p>
              <span className="font-medium text-neutral-700">{t('contactEmail')}:</span>{' '}
              <a
                href="mailto:info@trendswiss.ch"
                className="text-red-600 hover:underline"
              >
                info@trendswiss.ch
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Tamno siva linija */}
      <div className="h-1 w-full bg-[var(--header-dark)]" aria-hidden />

      {/* Explore by category (Leon-like) — replaces 3 "Shop" cards */}
      <section className="border-t border-neutral-200 bg-white py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900">{tShop('exploreByCategory')}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {exploreCategories.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/shop?pcats=${c.id}`}
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
                      {tShop('view')} →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg ring-2 ring-red-400/50 transition hover:bg-red-700 hover:shadow-xl"
            >
              {tShop('allProducts')} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
