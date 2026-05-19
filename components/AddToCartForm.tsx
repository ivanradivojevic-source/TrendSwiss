'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Product } from '@/data/products';
import { getVariant } from '@/data/products';
import { useCartStore } from '@/store/cart-store';
import LeonSizeGuideModal from '@/components/LeonSizeGuideModal';
import { CATALOG_MODE } from '@/src/lib/catalogMode';
import { variantPriceCHF } from '@/src/lib/productPrice';

export default function AddToCartForm({
  product,
  locale,
  modelGroupSiblings,
}: {
  product: Product;
  locale: 'de' | 'fr' | 'en' | 'it';
  /** When several catalogue rows share `modelGroupId`, colour choice is on PDP links — hide duplicate swatches. */
  modelGroupSiblings?: Product[];
}) {
  const t = useTranslations('shop');
  const addLine = useCartStore((s) => s.addLine);
  const [size, setSize] = useState<string>(product.sizes[0]?.id ?? '');
  const [color, setColor] = useState<string>(product.colors[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [flying, setFlying] = useState(false);

  const variant = getVariant(product, size, color);
  const unitPrice = variant ? variantPriceCHF(variant, product) : null;
  const colorMeta = product.colors.find((c) => c.id === color);
  const groupedModelColors = (modelGroupSiblings?.length ?? 0) > 1;
  const leonSingleModelVariant =
    product.brand === 'leon' && !groupedModelColors;
  const showInlineColorSwatches =
    !groupedModelColors && !leonSingleModelVariant && product.colors.length > 1;
  const showLeonSizeGuide =
    product.brand === 'leon' &&
    (product.category === 'men' || product.category === 'women');
  const leonSizeGuideVariant =
    product.category === 'women' ? 'women' : 'men';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (CATALOG_MODE) return;
    if (!variant || unitPrice == null || flying) return;
    addLine({
      productId: product.id,
      slug: product.slug,
      name: product.name[locale],
      image: product.image,
      size,
      color: colorMeta?.label ?? color,
      colorHex: colorMeta?.hex,
      priceCHF: unitPrice,
      quantity: qty,
      sku: variant.sku,
    });
    setAdded(true);
    setFlying(true);
    setTimeout(() => {
      setFlying(false);
      setAdded(false);
    }, 1050);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {CATALOG_MODE ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('purchaseDisabled')}
        </div>
      ) : null}
      <div>
        <div className="flex max-w-xs items-baseline justify-between gap-2">
          <label className="text-sm font-medium text-neutral-700">
            {t('size')}
          </label>
          {showLeonSizeGuide ? (
            <LeonSizeGuideModal variant={leonSizeGuideVariant} />
          ) : null}
        </div>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2"
        >
          {product.sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label[locale]}
            </option>
          ))}
        </select>
      </div>
      {showInlineColorSwatches ? (
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {t('color')}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={`h-9 w-9 rounded-full border-2 ${
                  color === c.id ? 'border-neutral-900' : 'border-neutral-300'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          {t('quantity')}
        </label>
        <input
          type="number"
          min={1}
          max={variant?.stock ?? 99}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          disabled={CATALOG_MODE}
          className="mt-1 w-24 rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>
      <div
        className={`flex flex-wrap items-center justify-center gap-0 overflow-visible ${flying ? 'shop-fly-active-short' : ''}`}
      >
        <span
          className={`relative -mr-3 hidden h-[5.2rem] w-28 flex-shrink-0 overflow-visible sm:block ${flying ? 'wing-flap-left-short' : 'translate-y-[-0.5cm]'}`}
        >
          <Image
            src="/wing-no-background.png"
            alt=""
            width={112}
            height={83}
            className="h-full w-full object-contain object-center"
            aria-hidden
            unoptimized
          />
        </span>
        <button
          type="submit"
          disabled={CATALOG_MODE || !variant || unitPrice == null || variant.stock < qty || flying}
          className="inline-flex h-[3.5rem] items-center justify-center rounded-2xl bg-red-600 px-10 py-4 font-bold text-white shadow-xl ring-4 ring-red-300/50 transition hover:bg-red-700 hover:shadow-2xl hover:ring-red-400/60 focus:outline-none focus:ring-4 focus:ring-red-400 disabled:opacity-50 disabled:pointer-events-none"
        >
          {CATALOG_MODE ? t('catalogOnly') : added ? '✓ ' + t('addToCart') : t('addToCart')}
        </button>
        <span
          className={`relative -ml-3 hidden h-[5.2rem] w-28 flex-shrink-0 overflow-visible sm:block ${flying ? 'wing-flap-right-short' : ''}`}
          style={flying ? undefined : { transform: 'scaleX(-1) translateY(-0.5cm)' }}
        >
          <Image
            src="/wing-no-background.png"
            alt=""
            width={112}
            height={83}
            className="h-full w-full object-contain object-center"
            aria-hidden
            unoptimized
          />
        </span>
      </div>
    </form>
  );
}
