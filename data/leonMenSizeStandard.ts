import type { Product } from './products';
import { LEON_MEN_EU_SIZES } from './leonMenSizeTable';

export { LEON_MEN_EU_SIZES, LEON_MEN_FOOT_LENGTH_MM } from './leonMenSizeTable';

function splitLeonVariantSku(
  sku: string,
  colorIds: string[]
): { prefix: string; color: string } | null {
  const sorted = [...colorIds].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    const suf = `-${c}`;
    if (sku.endsWith(suf)) {
      const rest = sku.slice(0, -suf.length);
      const mm = rest.match(/-(\d{2})$/);
      if (mm) {
        const prefix = rest.slice(0, -(`-${mm[1]}`).length);
        return { prefix, color: c };
      }
    }
  }
  return null;
}

/** Rebuild sizes & variants to EU 41–47 for men's Leon catalogue rows. */
export function applyLeonMenStandardSizesIfApplicable(p: Product): Product {
  if (p.brand !== 'leon' || p.category !== 'men') return p;
  const first = p.variants[0];
  if (!first) return p;

  const parsed = splitLeonVariantSku(first.sku, p.colors.map((c) => c.id));
  if (!parsed) return p;

  const { prefix } = parsed;
  const sizes = LEON_MEN_EU_SIZES.map((id) => ({
    id,
    label: { de: id, fr: id, en: id, it: id },
  }));

  const variants = LEON_MEN_EU_SIZES.flatMap((size) =>
    p.colors.map((c) => {
      const ref =
        p.variants.find((v) => v.color === c.id) ??
        p.variants.find((v) => v.size === size) ??
        first;
      return {
        size,
        color: c.id,
        sku: `${prefix}-${size}-${c.id}`,
        priceCHF: ref.priceCHF,
        stock: ref.stock,
      };
    })
  );

  return { ...p, sizes, variants };
}
