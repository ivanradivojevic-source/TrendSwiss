import type { Product } from '@/data/products';
import type { ExploreCategoryId } from '@/data/explore-categories';
import { leonExploreTagsByProductId } from '@/data/leon-explore-tags.generated';

function norm(s: string | undefined) {
  return (s ?? '').toLowerCase();
}

function productText(p: Product) {
  const name = `${p.name.de} ${p.name.fr} ${p.name.en} ${p.name.it}`;
  const desc = `${p.description.de} ${p.description.fr} ${p.description.en} ${p.description.it}`;
  return `${p.slug} ${name} ${desc}`.toLowerCase();
}

/**
 * Best-effort classifier for "Istraži po kategoriji".
 * We compute tags dynamically so we don't have to edit every product by hand.
 */
export function getExploreCategoriesForProduct(p: Product): ExploreCategoryId[] {
  // Prefer exact tags generated from Leon breadcrumbs (highest accuracy).
  const exact = (leonExploreTagsByProductId as Record<string, ExploreCategoryId[] | undefined>)[p.id];
  if (exact?.length) return exact;

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

  return Array.from(tags);
}

