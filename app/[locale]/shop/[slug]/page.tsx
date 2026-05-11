import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getProductBySlug, getProductsByModelGroup } from '@/data/products';
import AddToCartForm from '@/components/AddToCartForm';
import ProductTabs from '@/components/ProductTabs';
import ProductGallery from '@/components/ProductGallery';
import ProductModelColorLinks from '@/components/ProductModelColorLinks';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const fromModelGroup = product.modelGroupId
    ? getProductsByModelGroup(product.modelGroupId).filter(
        (q) => q.category === product.category
      )
    : [];
  const modelSiblings = fromModelGroup.length > 0 ? fromModelGroup : [product];
  const t = await getTranslations('shop');
  const loc = locale as 'de' | 'fr' | 'en' | 'it';
  const variantPrices = product.variants.map((v) => v.priceCHF);
  const priceMin =
    variantPrices.length > 0 ? Math.min(...variantPrices) : null;
  const priceMax =
    variantPrices.length > 0 ? Math.max(...variantPrices) : null;

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
          <p className="mt-4 text-neutral-600">{product.description[loc]}</p>
          <p className="mt-4 text-lg font-semibold text-red-600">
            {priceMin != null && priceMax != null ? (
              <>
                {t('chf')} {priceMin} – {priceMax}
              </>
            ) : (
              <>{t('chf')} —</>
            )}
          </p>
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
