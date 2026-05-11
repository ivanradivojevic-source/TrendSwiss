import { getTranslations } from 'next-intl/server';
import CartContent from '@/components/CartContent';
export default async function CartPage() {
  const t = await getTranslations('cart');
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
      <CartContent />
    </div>
  );
}
