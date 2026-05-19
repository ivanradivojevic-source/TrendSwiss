/**
 * Product catalog – edit this file to add/change products, images, descriptions, prices.
 * Kategorije: Frauen, Männer, Kinder (kao leon.rs).
 */
import type { CategoryId } from './categories';
import { harborMensSandalProducts } from './harbor-mens-sandals';
import { applyLeonMenStandardSizesIfApplicable } from './leonMenSizeStandard';
import { normalizeLeonImportedProducts } from './leonCatalogNormalize';
import { leonProducts } from './leon-products.generated';
import { milamiProducts } from './milami-products.generated';
import leonSlugRedirects from './leon-slug-redirects.json';

export type ProductId = string;
export type SizeId = string;
export type ColorId = string;
export type Locale = 'de' | 'fr' | 'en' | 'it';
export type LocalizedString = Record<Locale, string>;

export interface ProductSpecificationRow {
  label: LocalizedString;
  value: LocalizedString;
}

export interface ProductVariant {
  size: SizeId;
  color: ColorId;
  sku: string;
  /** Maloprodajna cena (CHF); null = nema cene u Excel katalogu */
  priceCHF: number | null;
  stock: number;
}

export interface Product {
  id: ProductId;
  slug: string;
  category: CategoryId; // 'women' | 'men' | 'children'
  brand?: 'leon' | 'milami' | 'other';
  /** LEON / Excel broj artikla (npr. 6016, 4710M, PU100M) — isti za sve boje modela. */
  articleNumber?: string;
  /** Boja linije (npr. „Crna“) — kao na leon.rs uz SKU. */
  colorLabel?: string;
  /** Same id = one physical model in several shop rows / slugs; used on PDP to switch colours. */
  modelGroupId?: string;
  name: LocalizedString;
  description: LocalizedString;
  /** Leon.rs Sastav lica / Podnožje / Đon — shown together in Specifications tab. */
  specifications?: ProductSpecificationRow[];
  image: string; // path in /public or URL
  images?: string[];
  sizes: { id: SizeId; label: Record<'de' | 'fr' | 'en' | 'it', string> }[];
  colors: { id: ColorId; label: string; hex: string }[];
  variants: ProductVariant[];
}

const productsRaw: Product[] = [
  {
    id: 'slippers-classic',
    slug: 'papuce-klasicne',
    category: 'women',
    brand: 'leon',
    name: {
      de: 'Klassische Hausschuhe',
      fr: 'Pantoufles classiques',
      en: 'Classic Slippers',
      it: 'Pantofole classiche',
    },
    description: {
      de: 'Bequeme Hausschuhe aus weichem Material. Ideal für zu Hause.',
      fr: 'Pantoufles confortables en matière douce. Idéales pour la maison.',
      en: 'Comfortable slippers made of soft material. Ideal for home.',
      it: 'Pantofole comode in materiale morbido. Ideali per la casa.',
    },
    image: 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80'],
    sizes: [
      { id: '36', label: { de: '36', fr: '36', en: '36', it: '36' } },
      { id: '37', label: { de: '37', fr: '37', en: '37', it: '37' } },
      { id: '38', label: { de: '38', fr: '38', en: '38', it: '38' } },
      { id: '39', label: { de: '39', fr: '39', en: '39', it: '39' } },
      { id: '40', label: { de: '40', fr: '40', en: '40', it: '40' } },
      { id: '41', label: { de: '41', fr: '41', en: '41', it: '41' } },
      { id: '42', label: { de: '42', fr: '42', en: '42', it: '42' } },
    ],
    colors: [
      { id: 'navy', label: 'Navy', hex: '#1e3a5f' },
      { id: 'grey', label: 'Grau', hex: '#6b7280' },
      { id: 'burgundy', label: 'Bordeaux', hex: '#722f37' },
      { id: 'black', label: 'Schwarz', hex: '#111827' },
    ],
    variants: [
      // Format: one variant per size+color with price and stock
      ...['36', '37', '38', '39', '40', '41', '42'].flatMap((size) =>
        (['navy', 'grey', 'burgundy', 'black'] as const).map((color) => ({
          size,
          color,
          sku: `SLIP-${size}-${color}`,
          priceCHF: null,
          stock: 10,
        }))
      ),
    ],
  },
  {
    id: 'slippers-sport',
    slug: 'papuce-sport',
    category: 'men',
    brand: 'leon',
    name: {
      de: 'Sport-Hausschuhe',
      fr: 'Pantoufles sport',
      en: 'Sport Slippers',
      it: 'Pantofole sportive',
    },
    description: {
      de: 'Leichte Sport-Hausschuhe mit rutschfester Sohle.',
      fr: 'Pantoufles sport légères avec semelle antidérapante.',
      en: 'Lightweight sport slippers with non-slip sole.',
      it: 'Pantofole sportive leggere con suola antiscivolo.',
    },
    image: 'https://images.unsplash.com/photo-1650307535558-fa2b39ed16eb?w=600&q=80',
    sizes: [
      { id: '38', label: { de: '38', fr: '38', en: '38', it: '38' } },
      { id: '39', label: { de: '39', fr: '39', en: '39', it: '39' } },
      { id: '40', label: { de: '40', fr: '40', en: '40', it: '40' } },
      { id: '41', label: { de: '41', fr: '41', en: '41', it: '41' } },
      { id: '42', label: { de: '42', fr: '42', en: '42', it: '42' } },
    ],
    colors: [
      { id: 'blue', label: 'Blau', hex: '#2563eb' },
      { id: 'black', label: 'Schwarz', hex: '#111827' },
      { id: 'white', label: 'Weiss', hex: '#f9fafb' },
    ],
    variants: [
      ...['38', '39', '40', '41', '42'].flatMap((size) =>
        (['blue', 'black', 'white'] as const).map((color) => ({
          size,
          color,
          sku: `SLIP-SPORT-${size}-${color}`,
          priceCHF: null,
          stock: 8,
        }))
      ),
    ],
  },
  {
    id: 'slippers-kids',
    slug: 'papuce-kinder',
    category: 'children',
    brand: 'leon',
    name: {
      de: 'Kinder-Hausschuhe',
      fr: 'Pantoufles enfants',
      en: "Children's Slippers",
      it: 'Pantofole per bambini',
    },
    description: {
      de: 'Weiche, sichere Hausschuhe für Kinder. Rutschfeste Sohle.',
      fr: 'Pantoufles douces et sûres pour les enfants. Semelle antidérapante.',
      en: 'Soft, safe slippers for kids. Non-slip sole.',
      it: 'Pantofole morbide e sicure per bambini. Suola antiscivolo.',
    },
    image: 'https://images.unsplash.com/photo-1543420629-5350879dd4cd?w=600&q=80',
    sizes: [
      { id: '28', label: { de: '28', fr: '28', en: '28', it: '28' } },
      { id: '30', label: { de: '30', fr: '30', en: '30', it: '30' } },
      { id: '32', label: { de: '32', fr: '32', en: '32', it: '32' } },
      { id: '34', label: { de: '34', fr: '34', en: '34', it: '34' } },
    ],
    colors: [
      { id: 'pink', label: 'Rosa', hex: '#ec4899' },
      { id: 'blue', label: 'Blau', hex: '#2563eb' },
      { id: 'green', label: 'Grün', hex: '#22c55e' },
    ],
    variants: [
      ...['28', '30', '32', '34'].flatMap((size) =>
        (['pink', 'blue', 'green'] as const).map((color) => ({
          size,
          color,
          sku: `KIDS-${size}-${color}`,
          priceCHF: null,
          stock: 12,
        }))
      ),
    ],
  },
  ...normalizeLeonImportedProducts(leonProducts as unknown as Product[]),
  ...harborMensSandalProducts,
  ...(milamiProducts as unknown as Product[]),
];

export const products: Product[] = productsRaw.map(applyLeonMenStandardSizesIfApplicable);

const slugRedirectMap = leonSlugRedirects as Record<string, string>;

/** Stari švajcarski slug → trenutni leon.rs slug (npr. bern-classic → ground-bela). */
export function resolveProductSlug(slug: string): string {
  return slugRedirectMap[slug] ?? slug;
}

export function getProductBySlug(slug: string): Product | undefined {
  const resolved = resolveProductSlug(slug);
  return products.find((p) => p.slug === resolved);
}

export function getProductsByModelGroup(modelGroupId: string): Product[] {
  return products.filter((p) => p.modelGroupId === modelGroupId);
}

export function getVariant(product: Product, size: SizeId, color: ColorId) {
  return product.variants.find((v) => v.size === size && v.color === color);
}
