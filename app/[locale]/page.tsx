import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { exploreCategories } from '@/data/explore-categories';
import ShopFlyButton from '@/components/ShopFlyButton';
import HomeGalleryCarousel from '@/components/HomeGalleryCarousel';
import { getHomeGalleryImages } from '@/src/lib/homeGalleryImages';
import type { HomeGalleryImage } from '@/src/lib/homeGalleryImages';

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
  const galleryImages: HomeGalleryImage[] = await getHomeGalleryImages();

  return (
    <div className="overflow-x-hidden">
      {/* Hero – slika + naslov; na mobilnom bez isečenja teksta */}
      <section className="overflow-visible px-4">
        <div className="relative mx-auto max-w-6xl overflow-visible">
          <div className="relative overflow-hidden leading-[0]">
            <Image
              src="/hero-backdrop-trim.png"
              alt=""
              width={1024}
              height={570}
              priority
              unoptimized
              className="block h-auto w-full align-bottom sm:w-[106%] sm:max-w-none sm:-translate-x-[3%]"
            />
            <div className="absolute inset-0 bg-white/20" aria-hidden />
          </div>
          <div className="absolute inset-x-0 top-[14%] z-20 px-3 text-center sm:top-[16%] sm:-translate-y-1/2 sm:px-8 md:top-[14%]">
            <div className="relative mx-auto max-w-2xl sm:-translate-y-3">
              <h1 className="text-xl font-bold leading-snug text-neutral-900 drop-shadow-sm sm:text-3xl md:text-4xl">
                {t('heroTitle')}
              </h1>
              <p className="mt-1.5 text-base font-semibold leading-snug text-red-600 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] sm:mt-2 sm:text-xl md:text-2xl">
                {t('heroSubtitle')}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-0 top-[54%] z-10 flex justify-center px-2 sm:top-[42%] sm:-translate-y-1/2 sm:px-4">
            <ShopFlyButton href={`/${locale}/shop`}>
              <span className="text-lg">{tNav('shop')}</span>
            </ShopFlyButton>
          </div>
        </div>
      </section>

      {/* Tamno siva linija kao na vrhu */}
      <div className="h-1 w-full bg-[var(--header-dark)]" aria-hidden />

      {/* Explore by category (Leon-like) */}
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
            <ShopFlyButton href={`/${locale}/shop`}>
              <span className="text-lg">{tNav('shop')}</span>
            </ShopFlyButton>
          </div>
        </div>
      </section>

      {/* Galerija slika */}
      <section className="border-t-2 border-red-600/10 bg-red-50/60 py-12 px-4">
        <div className="mx-auto max-w-6xl">
          <HomeGalleryCarousel images={galleryImages} ariaLabel={t('galleryAriaLabel')} />
        </div>
      </section>

      {/* About us */}
      <section id="about" className="scroll-mt-20 border-t-2 border-red-600/10 bg-white py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
            {t('aboutTitle')}
          </h2>
          <p className="mt-5 text-center text-xl font-semibold text-neutral-900">
            {t('aboutCompany')}
          </p>
          <p className="mx-auto mt-2 max-w-4xl text-center text-neutral-600">
            {t('aboutTagline')}
          </p>

          <div className="mt-8 grid gap-6 text-neutral-700 leading-relaxed lg:grid-cols-2 lg:gap-x-12 lg:gap-y-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{t('aboutWelcomeTitle')}</h3>
              <p className="mt-2">{t('aboutWelcomeBody')}</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">{t('aboutPhilosophyTitle')}</h3>
              <p className="mt-2">{t('aboutPhilosophyBody')}</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">{t('aboutAssortmentTitle')}</h3>
              <p className="mt-2">{t('aboutAssortmentBody')}</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">{t('aboutPartnerTitle')}</h3>
              <p className="mt-2">{t('aboutPartnerBody1')}</p>
              <p className="mt-2">{t('aboutPartnerBody2')}</p>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-center text-xl font-bold text-red-600 sm:text-2xl">
                {t('aboutWhyTitle')}
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-x-10">
                {(
                  [
                    ['aboutWhy1Title', 'aboutWhy1Text'],
                    ['aboutWhy2Title', 'aboutWhy2Text'],
                    ['aboutWhy3Title', 'aboutWhy3Text'],
                    ['aboutWhy4Title', 'aboutWhy4Text'],
                  ] as const
                ).map(([titleKey, textKey]) => (
                  <li key={titleKey}>
                    <span className="font-semibold text-neutral-900">{t(titleKey)}</span>{' '}
                    {t(textKey)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <p className="font-medium text-neutral-900">{t('aboutClosingLine')}</p>
              <p className="mt-3 text-center text-lg font-semibold text-red-700">
                {t('aboutFooterLine')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact — skroz dole */}
      <section id="contact" className="scroll-mt-20 border-t border-neutral-200 bg-neutral-100 py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-neutral-900">{t('contactTitle')}</h2>
          <div className="mt-8 inline-block space-y-3 text-left text-neutral-600">
            <p className="font-semibold text-neutral-900">{t('aboutCompany')}</p>
            <p>
              {t('contactStreet')}
              <br />
              {t('contactCity')}
              <br />
              {t('contactCountry')}
            </p>
            <p>
              <span className="font-medium text-neutral-700">{t('contactPhone')}:</span>{' '}
              <a href="tel:+41772314129" className="text-red-600 hover:underline">
                +41 77 231 41 29
              </a>
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
    </div>
  );
}
