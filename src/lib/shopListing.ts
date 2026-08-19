import { products } from '@/data/products';
import type { CategoryId } from '@/data/categories';
import type { ExploreCategoryId } from '@/data/explore-categories';
import type { Locale, LocalizedString } from '@/data/products';
import { getExploreCategoriesForProduct, isUncategorizedProduct } from '@/src/lib/exploreClassifier';
import { formatArticleLine } from '@/src/lib/productArticle';
import { HIDE_PRICES } from '@/src/lib/catalogMode';
import { productHasPrice, productPriceRange } from '@/src/lib/productPrice';

export type ShopListingItem = {
  id: string;
  slug: string;
  category: CategoryId;
  brand?: 'leon' | 'milami' | 'other';
  image: string;
  name: LocalizedString;
  articleLine: string | null;
  priceMin: number | null;
  priceMax: number | null;
  explore: ExploreCategoryId[];
  uncategorized: boolean;
};

let cached: ShopListingItem[] | null = null;

/** Slim catalog for shop grid — built once per server process / build. */
export function getShopListing(): ShopListingItem[] {
  if (cached) return cached;
  cached = products.filter(productHasPrice).map((p) => {
    const range = productPriceRange(p);
    return {
      id: p.id,
      slug: p.slug,
      category: p.category,
      brand: p.brand,
      image: p.image,
      name: p.name,
      articleLine: formatArticleLine(p),
      priceMin: range?.min ?? null,
      priceMax: range?.max ?? null,
      explore: getExploreCategoriesForProduct(p),
      uncategorized: isUncategorizedProduct(p),
    };
  });
  return cached;
}

export function formatListingPrice(
  item: ShopListingItem,
  currencyLabel: string
): string | null {
  if (HIDE_PRICES) return null;
  if (item.priceMin == null || item.priceMax == null) return null;
  const min = item.priceMin.toFixed(2);
  const max = item.priceMax.toFixed(2);
  if (min === max) return `${currencyLabel} ${min}`;
  return `${currencyLabel} ${min} – ${max}`;
}

export type { Locale };
