import type { CategoryId } from '@/data/categories';
import { categories } from '@/data/categories';
import type { Product } from '@/data/products';
import type { ExploreCategoryId } from '@/data/explore-categories';
import { exploreCategories } from '@/data/explore-categories';
import { leonExploreTagsByProductId } from '@/data/leon-explore-tags.generated';

const VALID_GENDER_IDS = new Set<CategoryId>(categories.map((c) => c.id));
const ALL_EXPLORE_IDS = new Set<ExploreCategoryId>(exploreCategories.map((c) => c.id));

/** Ženske medicinske klompe — u filterima i Clogs i Medical clogs. */
const WOMEN_MEDICAL_CLOG_ARTICLES = new Set(['950', '970', '3500', '5000', '5001']);

/** Ženske papuče (Portofino I) — samo Slippers, ne klompe. */
const WOMEN_SLIPPER_ARTICLES = new Set(['6010', '510']);

/** Muške papuče — filter Slippers. */
const MEN_SLIPPER_ARTICLES = new Set(['4703M', '4704M', '4705M']);

/** Muške medicinske klompe — Clogs + Medical clogs. */
const MEN_MEDICAL_CLOG_ARTICLES = new Set(['PU100M']);

/** Muške klompe — filter Clogs (707M na leon.rs; V707M alias). */
const MEN_CLOG_ARTICLES = new Set([
  '300M',
  '700M',
  'V200M',
  'V202M',
  'V230M',
  '707M',
  'V707M',
  '4701M',
]);

/** Ženske sandale — filter Sandals. */
const WOMEN_SANDAL_ARTICLES = new Set([
  '967',
  '1120',
  '963',
  '965',
  '924',
  '1041',
  '1020',
  '935',
  '966',
  '2024',
  '1132',
  '1131',
]);

/** Dečije klompe — samo Clogs, ne papuče. */
const CHILDREN_CLOG_ARTICLES = new Set(['4800']);

/** Dečije papuče (Stella I). */
const CHILDREN_SLIPPER_ARTICLES = new Set(['4811']);

/** Dečije sandale (Stella II, Elio). */
const CHILDREN_SANDAL_ARTICLES = new Set(['4812', '4813']);

/** Ženske klompe — filter Clogs. */
const WOMEN_CLOG_ARTICLES = new Set([
  '300',
  '302',
  '6003',
  '902',
  '900',
  'V260',
  'V2090',
  '4251',
  '4250',
  '1024',
  '2019',
  '912',
  'V202',
  'V200',
  '7002',
]);

function withClogTags(tags: Iterable<ExploreCategoryId>): ExploreCategoryId[] {
  const out = new Set(tags);
  out.add('klompe');
  return Array.from(out);
}

function withMedicalClogTags(tags: Iterable<ExploreCategoryId>): ExploreCategoryId[] {
  const out = new Set(tags);
  out.add('klompe');
  out.add('medicinske-klompe');
  return Array.from(out);
}

function norm(s: string | undefined) {
  return (s ?? '').toLowerCase();
}

function productText(p: Product) {
  const name = `${p.name.de} ${p.name.fr} ${p.name.en} ${p.name.it}`;
  const desc = `${p.description.de} ${p.description.fr} ${p.description.en} ${p.description.it}`;
  return `${p.slug} ${name} ${desc}`.toLowerCase();
}

/** Preostali modeli bez tipa → papuče (žene/muškarci; deca osim eksplicitnih klompi). */
function finalizeExploreTags(p: Product, tags: ExploreCategoryId[]): ExploreCategoryId[] {
  if (tags.some((id) => ALL_EXPLORE_IDS.has(id))) return tags;
  if (
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_CLOG_ARTICLES.has(p.articleNumber)
  ) {
    return ['klompe'];
  }
  if (
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_SANDAL_ARTICLES.has(p.articleNumber)
  ) {
    return ['sandale'];
  }
  if (
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_SLIPPER_ARTICLES.has(p.articleNumber)
  ) {
    return ['papuce'];
  }
  if (p.category === 'women' || p.category === 'men') return ['papuce'];
  if (p.category === 'children') return ['papuce'];
  return tags;
}

/**
 * Best-effort classifier for "Istraži po kategoriji".
 * We compute tags dynamically so we don't have to edit every product by hand.
 */
export function getExploreCategoriesForProduct(p: Product): ExploreCategoryId[] {
  if (p.articleNumber != null && WOMEN_SLIPPER_ARTICLES.has(p.articleNumber)) {
    return ['papuce'];
  }

  const isWomenSlipper =
    p.category === 'women' &&
    p.articleNumber != null &&
    WOMEN_SLIPPER_ARTICLES.has(p.articleNumber);

  const isWomenMedicalClog =
    p.category === 'women' &&
    p.articleNumber != null &&
    WOMEN_MEDICAL_CLOG_ARTICLES.has(p.articleNumber);

  const isWomenClog =
    p.category === 'women' &&
    p.articleNumber != null &&
    WOMEN_CLOG_ARTICLES.has(p.articleNumber);

  const isMenClog =
    p.category === 'men' &&
    p.articleNumber != null &&
    MEN_CLOG_ARTICLES.has(p.articleNumber);

  const isMenMedicalClog =
    p.category === 'men' &&
    p.articleNumber != null &&
    MEN_MEDICAL_CLOG_ARTICLES.has(p.articleNumber);

  const isMenSlipper =
    p.category === 'men' &&
    p.articleNumber != null &&
    MEN_SLIPPER_ARTICLES.has(p.articleNumber);

  const isWomenSandal =
    p.category === 'women' &&
    p.articleNumber != null &&
    WOMEN_SANDAL_ARTICLES.has(p.articleNumber);

  const isChildrenClog =
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_CLOG_ARTICLES.has(p.articleNumber);

  if (isWomenSlipper || isMenSlipper) return ['papuce'];
  if (isWomenSandal) return ['sandale'];
  const isChildrenSlipper =
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_SLIPPER_ARTICLES.has(p.articleNumber);

  const isChildrenSandal =
    p.category === 'children' &&
    p.articleNumber != null &&
    CHILDREN_SANDAL_ARTICLES.has(p.articleNumber);

  if (isChildrenClog) return ['klompe'];
  if (isChildrenSandal) return ['sandale'];
  if (isChildrenSlipper) return ['papuce'];

  // Prefer exact tags generated from Leon breadcrumbs (highest accuracy).
  const exact = (leonExploreTagsByProductId as Record<string, ExploreCategoryId[] | undefined>)[p.id];
  if (exact?.length) {
    if (isWomenMedicalClog || isMenMedicalClog) return finalizeExploreTags(p, withMedicalClogTags(exact));
    if (isChildrenClog || isWomenClog || isMenClog) return finalizeExploreTags(p, withClogTags(exact));
    return finalizeExploreTags(p, exact);
  }

  const hay = productText(p);
  const tags = new Set<ExploreCategoryId>();

  // Medical should be very strong (often overlaps with clogs).
  if (/(medic|medical|medizin|sanit)/.test(hay)) tags.add('medicinske-klompe');

  // House slippers: keep this strict.
  // Many product descriptions mention "at home / zu Hause / à la maison" for *all* products,
  // so we only match explicit indoor / house-slipper keywords.
  if (/(sobn|indoor|house\s*slipper)/.test(hay)) tags.add('sobne-papuce');

  // Sandals.
  if (/(sandal|sandale|sandali|sandales)/.test(hay)) tags.add('sandale');

  // Clogs.
  if (/(klomp|clog|sabot|sabots|zoccol)/.test(hay)) tags.add('klompe');

  // Slippers (general).
  if (/(papuc|slipper|pantoufle|pantofole|hausschuh)/.test(hay)) tags.add('papuce');

  // New: keep as an extra tag, not exclusive.
  if (/(^|\W)(novo|new|neu|nouveau|novit[aà]|novita)(\W|$)/.test(hay)) tags.add('novo');

  const inferred = Array.from(tags);
  if (isWomenMedicalClog || isMenMedicalClog) return finalizeExploreTags(p, withMedicalClogTags(inferred));
  if (isChildrenClog || isWomenClog || isMenClog) return finalizeExploreTags(p, withClogTags(inferred));
  return finalizeExploreTags(p, inferred);
}

/** Shop QA: no gender bucket and/or no product-type explore tag. */
export function isUncategorizedProduct(p: Product): boolean {
  const hasGender = VALID_GENDER_IDS.has(p.category);
  const exploreTags = getExploreCategoriesForProduct(p);
  const hasProductType = exploreTags.some((id) => ALL_EXPLORE_IDS.has(id));
  return !hasGender || !hasProductType;
}

