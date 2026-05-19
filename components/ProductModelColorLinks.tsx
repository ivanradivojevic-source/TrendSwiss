'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Product } from '@/data/products';
import {
  formatColorPickerArticleLine,
  localizedColorDisplayName,
} from '@/src/lib/productArticle';

export default function ProductModelColorLinks({
  locale,
  currentSlug,
  siblings,
}: {
  locale: string;
  currentSlug: string;
  siblings: Product[];
}) {
  const t = useTranslations('shop');
  if (siblings.length <= 1) return null;

  const loc = locale as 'de' | 'fr' | 'en' | 'it';
  const ordered = [...siblings].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-neutral-700">{t('sameModelColors')}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {ordered.map((p) => {
          const active = p.slug === currentSlug;
          const colorName = localizedColorDisplayName(p, loc);
          const articleLine = formatColorPickerArticleLine(p, siblings, loc);
          return (
            <Link
              key={p.id}
              href={`/${locale}/shop/${p.slug}`}
              className={`flex max-w-[14rem] items-center gap-2 rounded-xl border-2 px-2 py-1.5 transition ${
                active ? 'border-red-600 bg-red-50' : 'border-neutral-200 hover:border-red-200'
              }`}
            >
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={p.image}
                  alt={colorName ?? ''}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-snug text-neutral-900">
                  {colorName ?? p.name[loc]}
                </span>
                {articleLine ? (
                  <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">
                    {articleLine}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
