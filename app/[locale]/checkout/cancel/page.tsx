import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function CheckoutCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-neutral-600">{t('cancelMessage')}</p>
      <Link
        href={`/${locale}/cart`}
        className="mt-6 inline-block text-red-600 hover:underline"
      >
        {t('backToShop')}
      </Link>
    </div>
  );
}
