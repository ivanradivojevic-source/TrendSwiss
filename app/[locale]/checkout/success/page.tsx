'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';

export default function CheckoutSuccessPage() {
  const t = useTranslations('checkout');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const sessionId = searchParams.get('session_id');
  const locale = pathname?.split('/')[1] || 'de';

  useEffect(() => {
    if (sessionId) clearCart();
  }, [sessionId, clearCart]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-xl border border-green-200 bg-green-50 p-8">
        <h1 className="text-2xl font-bold text-green-800">{t('successTitle')}</h1>
        <p className="mt-4 text-green-700">{t('successMessage')}</p>
        <Link
          href={`/${locale}/shop`}
          className="mt-8 inline-block rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
        >
          {t('backToShop')}
        </Link>
      </div>
    </div>
  );
}
