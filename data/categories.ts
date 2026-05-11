/**
 * Kategorije proizvoda – žene, muškarci, deca (kao na leon.rs).
 */
export type CategoryId = 'women' | 'men' | 'children';

export interface Category {
  id: CategoryId;
  slug: string;
  name: Record<'de' | 'fr' | 'en' | 'it', string>;
}

export const categories: Category[] = [
  {
    id: 'women',
    slug: 'frauen',
    name: { de: 'Frauen', fr: 'Femmes', en: 'Women', it: 'Donne' },
  },
  {
    id: 'men',
    slug: 'maenner',
    name: { de: 'Männer', fr: 'Hommes', en: 'Men', it: 'Uomini' },
  },
  {
    id: 'children',
    slug: 'kinder',
    name: { de: 'Kinder', fr: 'Enfants', en: 'Children', it: 'Bambini' },
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getCategoryById(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id);
}
