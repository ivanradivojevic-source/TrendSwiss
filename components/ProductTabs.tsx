'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Product } from '@/data/products';

const TAB_IDS = ['specs', 'description', 'shipping', 'reviews'] as const;

export default function ProductTabs({
  product,
  locale,
}: {
  product: Product;
  locale: 'de' | 'fr' | 'en' | 'it';
}) {
  const t = useTranslations('productTabs');
  const [active, setActive] = useState<(typeof TAB_IDS)[number]>('specs');

  return (
    <div className="mt-12 border-t border-neutral-200 pt-8">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
              active === id
                ? 'border border-neutral-200 border-b-white bg-white text-red-600 -mb-px'
                : 'border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            {t(id)}
          </button>
        ))}
      </div>
      <div className="rounded-b-lg border border-t-0 border-neutral-200 bg-white px-4 py-6 text-neutral-700">
        {active === 'specs' &&
          (product.specifications?.length ? (
            <dl className="space-y-4">
              {product.specifications.map((row, i) => (
                <Fragment key={i}>
                  <dt className="text-sm font-semibold text-neutral-900">
                    {row.label[locale]}
                  </dt>
                  <dd className="mt-1 mb-4 last:mb-0 text-neutral-600">
                    {row.value[locale]}
                  </dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <p className="whitespace-pre-line">{t('specsContent')}</p>
          ))}
        {active === 'description' && (
          <p className="whitespace-pre-line">{product.description[locale]}</p>
        )}
        {active === 'shipping' && (
          <p className="whitespace-pre-line">{t('shippingContent')}</p>
        )}
        {active === 'reviews' && (
          <div>
            <p className="mb-4 font-medium text-neutral-900">{t('reviewsIntro')}</p>
            <ul className="space-y-3">
              {[t('review1'), t('review2'), t('review3')].map((text, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500" aria-hidden>★★★★★</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
