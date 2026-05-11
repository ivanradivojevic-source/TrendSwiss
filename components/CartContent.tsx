'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart-store';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { findVoucher, applyVoucher } from '@/data/vouchers';

export default function CartContent() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const base = `/${locale}`;
  const { lines, removeLine, setQuantity, setVoucher, voucherCode, discountCHF, clearCart } = useCartStore();
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + l.priceCHF * l.quantity, 0);
  const total = Math.max(0, subtotal - discountCHF);

  const handleApplyVoucher = () => {
    setVoucherError(null);
    if (!voucherInput.trim()) {
      setVoucher(null, 0);
      return;
    }
    const v = findVoucher(voucherInput, subtotal);
    if (!v) {
      setVoucherError(t('voucherInvalid'));
      setVoucher(null, 0);
      return;
    }
    const discount = applyVoucher(v, subtotal);
    setVoucher(v.code, discount);
  };

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border-2 border-red-100 bg-red-50/60 p-10 text-center">
        <p className="text-neutral-700">{t('empty')}</p>
        <Link href={`${base}/shop`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700">
          {t('goToShop')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8">
      <div className="rounded-xl border-2 border-red-100 bg-white overflow-hidden shadow-sm">
        <ul className="divide-y divide-neutral-200">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-4 p-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={line.image}
                  alt={line.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900">{line.name}</p>
                <p className="text-sm text-neutral-500">
                  {line.size} / {line.color}
                </p>
                <p className="text-red-600 font-medium">
                  {line.priceCHF.toFixed(2)} CHF × {line.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => setQuantity(i, Number(e.target.value))}
                  className="w-14 rounded border border-neutral-300 px-2 py-1 text-center"
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={voucherInput}
            onChange={(e) => { setVoucherInput(e.target.value); setVoucherError(null); }}
            placeholder={t('voucherPlaceholder')}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 uppercase"
          />
          <button
            type="button"
            onClick={handleApplyVoucher}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-white hover:bg-neutral-900"
          >
            {t('applyVoucher')}
          </button>
        </div>
        {voucherError && <p className="mt-2 text-sm text-red-600">{voucherError}</p>}
        {voucherCode && discountCHF > 0 && (
          <p className="mt-2 text-sm text-green-600">
            {t('voucherApplied', { code: voucherCode, amount: discountCHF.toFixed(2) })}
          </p>
        )}
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50/80 p-6 ring-1 ring-red-100">
        <div className="space-y-2">
          <div className="flex justify-between text-neutral-700">
            <span>{t('subtotal')}</span>
            <span>{subtotal.toFixed(2)} CHF</span>
          </div>
          {discountCHF > 0 && (
            <div className="flex justify-between text-green-700">
              <span>{t('discount')}</span>
              <span>-{discountCHF.toFixed(2)} CHF</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-neutral-900">
            <span>{t('total')}</span>
            <span>{total.toFixed(2)} CHF</span>
          </div>
        </div>
        <CheckoutButton totalCHF={total} locale={locale} />
      </div>
    </div>
  );
}

function CheckoutButton({ totalCHF, locale }: { totalCHF: number; locale: string }) {
  const t = useTranslations('cart');
  const [loading, setLoading] = useState(false);
  const lines = useCartStore((s) => s.lines);
  const discountCHF = useCartStore((s) => s.discountCHF);
  const voucherCode = useCartStore((s) => s.voucherCode);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            name: l.name,
            image: l.image,
            priceCHF: l.priceCHF,
            quantity: l.quantity,
            sku: l.sku,
          })),
          discountCHF,
          voucherCode,
          locale,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Checkout fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading || totalCHF <= 0}
      className="mt-6 w-full rounded-xl bg-red-600 py-3.5 font-semibold text-white shadow-lg ring-2 ring-red-400/40 transition hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? '…' : t('checkout')}
    </button>
  );
}
