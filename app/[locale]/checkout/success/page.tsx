import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import CheckoutSuccessClient from '@/components/CheckoutSuccessClient';

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-500">…</div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
