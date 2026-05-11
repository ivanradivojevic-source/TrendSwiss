export type ExploreCategoryId =
  | 'klompe'
  | 'sandale'
  | 'papuce'
  | 'sobne-papuce'
  | 'medicinske-klompe'
  | 'novo';

export interface ExploreCategory {
  id: ExploreCategoryId;
  label: Record<'de' | 'fr' | 'en' | 'it', string>;
  image: string; // marketing image url/path
}

// NOTE: We intentionally use neutral/stock images here (not leon.rs assets),
// while keeping the layout/UX identical to the reference.
export const exploreCategories: ExploreCategory[] = [
  {
    id: 'klompe',
    label: { de: 'Clogs', fr: 'Sabots', en: 'Clogs', it: 'Zoccoli' },
    image: '/categories/klompe.png',
  },
  {
    id: 'sandale',
    label: { de: 'Sandalen', fr: 'Sandales', en: 'Sandals', it: 'Sandali' },
    image: '/categories/sandale.png',
  },
  {
    id: 'papuce',
    label: { de: 'Hausschuhe', fr: 'Pantoufles', en: 'Slippers', it: 'Pantofole' },
    image: '/categories/papuce.png',
  },
  {
    id: 'sobne-papuce',
    label: {
      de: 'Hausschuhe (Zuhause)',
      fr: "Pantoufles d'intérieur",
      en: 'House slippers',
      it: 'Pantofole da casa',
    },
    image: '/categories/sobne-papuce.png',
  },
  {
    id: 'medicinske-klompe',
    label: { de: 'Medizinische Clogs', fr: 'Sabots médicaux', en: 'Medical clogs', it: 'Zoccoli medicali' },
    image: '/categories/medicinske-klompe.png',
  },
  {
    id: 'novo',
    label: { de: 'Neu', fr: 'Nouveautés', en: 'New', it: 'Novità' },
    image: '/categories/novo.png',
  },
];

