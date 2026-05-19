/**
 * Extract Opis + Sastav lica / Podnožje / Đon from leon.rs product HTML.
 */

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAccordionById(html, contentId) {
  const m = html.match(
    new RegExp(`id=["']${contentId}["'][^>]*>([\\s\\S]*?)</div>`, 'i')
  );
  if (!m?.[1]) return null;
  const text = stripHtml(m[1]);
  return text || null;
}

/** @returns {{ description: string | null, specs: { sastavLica: string | null, podnozje: string | null, don: string | null } }} */
export function extractLeonProductContent(html) {
  const description =
    extractAccordionById(html, 'accordion-content-details') ??
    extractAccordionById(html, 'accordion-content-description');

  const sastavLica = extractAccordionById(html, 'accordion-content-composition-table');
  const podnozje = extractAccordionById(html, 'accordion-content-footer-shoes');
  const don = extractAccordionById(html, 'accordion-content-sole');

  return {
    description,
    specs: { sastavLica, podnozje, don },
  };
}

export const SPEC_LABELS = {
  sastavLica: {
    de: 'Obermaterial',
    fr: 'Composition du dessus',
    en: 'Upper material',
    it: 'Tomaia',
  },
  podnozje: {
    de: 'Fußbett',
    fr: 'Semelle intérieure',
    en: 'Footbed',
    it: 'Plantare',
  },
  don: {
    de: 'Laufsohle',
    fr: 'Semelle extérieure',
    en: 'Outsole',
    it: 'Suola',
  },
};

/** @param {Record<string, string>} valueByLocale */
export function buildSpecificationRows(specs, valueByLocale) {
  const rows = [];
  if (specs.sastavLica && valueByLocale.sastavLica) {
    rows.push({ label: SPEC_LABELS.sastavLica, value: valueByLocale.sastavLica });
  }
  if (specs.podnozje && valueByLocale.podnozje) {
    rows.push({ label: SPEC_LABELS.podnozje, value: valueByLocale.podnozje });
  }
  if (specs.don && valueByLocale.don) {
    rows.push({ label: SPEC_LABELS.don, value: valueByLocale.don });
  }
  return rows;
}
