import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import ShopCatalog from '@/components/ShopCatalog';
import { getShopListing } from '@/src/lib/shopListing';
import type { Locale } from '@/src/lib/shopListing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations('shop');
  const listing = getShopListing();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-neutral-500">…</div>
      }
    >
      <ShopCatalog locale={locale as Locale} products={listing} />
    </Suspense>
  );
}
