import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { getProductBySlug, getProductsByModelGroup, resolveProductSlug } from '@/data/products';
import AddToCartForm from '@/components/AddToCartForm';
import ProductTabs from '@/components/ProductTabs';
import ProductGallery from '@/components/ProductGallery';
import ProductModelColorLinks from '@/components/ProductModelColorLinks';
import { formatArticleLineForProduct } from '@/src/lib/productArticle';
import { formatProductPriceLabel } from '@/src/lib/productPrice';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const canonicalSlug = resolveProductSlug(slug);
  if (canonicalSlug !== slug) {
    redirect(`/${locale}/shop/${canonicalSlug}`);
  }
  const product = getProductBySlug(canonicalSlug);
  if (!product) notFound();
  const fromModelGroup = product.modelGroupId
    ? getProductsByModelGroup(product.modelGroupId).filter(
        (q) => q.category === product.category
      )
    : [];
  const modelSiblings = fromModelGroup.length > 0 ? fromModelGroup : [product];
  const t = await getTranslations('shop');
  const loc = locale as 'de' | 'fr' | 'en' | 'it';
  const priceText = formatProductPriceLabel(product, t('chf'));
  const articleLine = formatArticleLineForProduct(product, modelSiblings);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery
          images={product.images?.length ? product.images : [product.image]}
          alt={product.name[loc]}
        />
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            {product.name[loc]}
          </h1>
          {articleLine ? (
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-medium text-neutral-500">{t('sku')}:</span>{' '}
              <span className="font-mono font-semibold tracking-wide text-neutral-900">
                {articleLine}
              </span>
            </p>
          ) : null}
          <p className="mt-4 text-neutral-600">{product.description[loc]}</p>
          {priceText ? (
            <p className="mt-4 text-lg font-semibold text-red-600">{priceText}</p>
          ) : null}
          <ProductModelColorLinks
            locale={locale}
            currentSlug={slug}
            siblings={modelSiblings}
          />
          <AddToCartForm
            product={product}
            locale={loc}
            modelGroupSiblings={modelSiblings}
          />
        </div>
      </div>
      <ProductTabs product={product} locale={loc} />
    </div>
  );
}
