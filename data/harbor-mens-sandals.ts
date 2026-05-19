import type { Product } from './products';

/** LEON 4710M “Harbor” — men's-only colour family (`leonCatalogNormalize` scopes groups by category). */
const MODEL_GROUP = 'leon-mg-4710m-men';
const CDN = 'https://cdn.leon.rs/wp-content/uploads/2026/04';

/** Leon men's EU range (same as shop standard for all men's Leon models). */
const SIZES = ['41', '42', '43', '44', '45', '46', '47'] as const;

const sizeRows = SIZES.map((id) => ({
  id,
  label: { de: id, fr: id, en: id, it: id },
}));

const desc: Product['description'] = {
  de: 'Herren-Sandale „Harbor“ (4710M): Anatomisch geformtes Fußbett mit Massagegel. Obermaterial aus Leder, PU-Laufsohle, Metall-Schnallen.',
  fr: 'Sandale homme « Harbor » (4710M) : assise plantaire anatomique avec gel massant. Dessus cuir, semelle PU, boucles métalliques.',
  en: 'Men’s “Harbor” sandal (4710M): anatomical footbed with massage gel. Leather upper, polyurethane sole, metal buckles.',
  it: 'Sandalo uomo «Harbor» (4710M): plantare anatomico con gel massaggiante. Tomaia in pelle, suola in PU, fibbie metalliche.',
};

const priceCHF = 79;

function variantsFor(skuColor: string, colorId: string) {
  return SIZES.map((size) => ({
    size,
    color: colorId,
    sku: `LEON-HARBOR-${skuColor}-${size}-${colorId}`,
    priceCHF,
    stock: 10,
  }));
}

export const harborMensSandalProducts: Product[] = [
  {
    id: 'leon-harbor-braon',
    slug: 'harbor-braon',
    category: 'men',
    brand: 'leon',
    articleNumber: '4710M',
    colorLabel: 'Braun',
    modelGroupId: MODEL_GROUP,
    name: {
      de: 'Harbor – Braun',
      fr: 'Harbor – Marron',
      en: 'Harbor – Brown',
      it: 'Harbor – Marrone',
    },
    description: desc,
    image: `${CDN}/4710M-Braon1.jpg`,
    images: [`${CDN}/4710M-Braon1.jpg`, `${CDN}/4710M-Braon2.jpg`],
    sizes: sizeRows,
    colors: [{ id: 'braon', label: 'Braun', hex: '#6b4423' }],
    variants: variantsFor('BRAON', 'braon'),
  },
  {
    id: 'leon-harbor-crna',
    slug: 'harbor-crna',
    category: 'men',
    brand: 'leon',
    articleNumber: '4710M',
    colorLabel: 'Schwarz Lack',
    modelGroupId: MODEL_GROUP,
    name: {
      de: 'Harbor – Schwarz (Lack)',
      fr: 'Harbor – Noir (verni)',
      en: 'Harbor – Black (patent)',
      it: 'Harbor – Nero (vernice)',
    },
    description: desc,
    image: `${CDN}/4710M-Crna-bakkar1.jpg`,
    images: [`${CDN}/4710M-Crna-bakkar1.jpg`, `${CDN}/4710M-Crna-bakkar2.jpg`],
    sizes: sizeRows,
    colors: [{ id: 'crna-bakkar', label: 'Schwarz Lack', hex: '#111827' }],
    variants: variantsFor('CRNA', 'crna-bakkar'),
  },
  {
    id: 'leon-harbor-siva',
    slug: 'harbor-siva',
    category: 'men',
    brand: 'leon',
    articleNumber: '4710M',
    colorLabel: 'Grau Velours',
    modelGroupId: MODEL_GROUP,
    name: {
      de: 'Harbor – Grau (Velours)',
      fr: 'Harbor – Gris (velours)',
      en: 'Harbor – Grey (suede)',
      it: 'Harbor – Grigio (velluto)',
    },
    description: desc,
    image: `${CDN}/4710M-Siva-velur1.jpg`,
    images: [`${CDN}/4710M-Siva-velur1.jpg`, `${CDN}/4710M-Siva-velur2.jpg`],
    sizes: sizeRows,
    colors: [{ id: 'siva-velur', label: 'Grau Velours', hex: '#9ca3af' }],
    variants: variantsFor('SIVA', 'siva-velur'),
  },
];
