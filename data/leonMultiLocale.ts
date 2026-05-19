import type { Product } from './products';
import type { CategoryId } from './categories';
import { leonStripColorSuffixParts } from './leonColorStrip';

export type Loc = 'de' | 'fr' | 'en' | 'it';

/** Match LEON colour tokens whether title uses ASCII or Serbian diacritics (žuta → zuta). */
export function normalizeLeonColorSlugKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ROMAN: Record<string, string> = {
  i: 'I',
  ii: 'II',
  iii: 'III',
  iv: 'IV',
  v: 'V',
};

/** Colour / finish tokens from LEON URL tail or title segment → four shop languages. */
export const LEON_COLOR_TO_LOCALE: Record<string, Record<Loc, string>> = {
  crna: { de: 'Schwarz', fr: 'Noir', en: 'Black', it: 'Nero' },
  bela: { de: 'Weiß', fr: 'Blanc', en: 'White', it: 'Bianco' },
  braon: { de: 'Braun', fr: 'Marron', en: 'Brown', it: 'Marrone' },
  siva: { de: 'Grau', fr: 'Gris', en: 'Grey', it: 'Grigio' },
  roze: { de: 'Rosa', fr: 'Rose', en: 'Pink', it: 'Rosa' },
  roza: { de: 'Rosa', fr: 'Rose', en: 'Pink', it: 'Rosa' },
  bez: { de: 'Beige', fr: 'Beige', en: 'Beige', it: 'Beige' },
  teget: { de: 'Anthrazit', fr: 'Anthracite', en: 'Charcoal', it: 'Antracite' },
  zelena: { de: 'Grün', fr: 'Vert', en: 'Green', it: 'Verde' },
  zlatna: { de: 'Gold', fr: 'Or', en: 'Gold', it: 'Oro' },
  zlato: { de: 'Gold', fr: 'Or', en: 'Gold', it: 'Oro' },
  bordo: { de: 'Bordeaux', fr: 'Bordeaux', en: 'Burgundy', it: 'Bordeaux' },
  perla: { de: 'Perle', fr: 'Perle', en: 'Pearl', it: 'Perla' },
  perlato: { de: 'Perlato', fr: 'Perlato', en: 'Perlato', it: 'Perlato' },
  ciklama: { de: 'Fuchsia', fr: 'Fuchsia', en: 'Fuchsia', it: 'Fucsia' },
  ljubicasta: { de: 'Lila', fr: 'Violet', en: 'Purple', it: 'Viola' },
  zuta: { de: 'Gelb', fr: 'Jaune', en: 'Yellow', it: 'Giallo' },
  maslinasto: { de: 'Oliv', fr: 'Olive', en: 'Olive', it: 'Oliva' },
  plava: { de: 'Blau', fr: 'Bleu', en: 'Blue', it: 'Blu' },
  crvena: { de: 'Rot', fr: 'Rouge', en: 'Red', it: 'Rosso' },
  sampanj: { de: 'Champagner', fr: 'Champagne', en: 'Champagne', it: 'Champagne' },
  mink: { de: 'Mink', fr: 'Mink', en: 'Mink', it: 'Mink' },
  mint: { de: 'Mint', fr: 'Menthe', en: 'Mint', it: 'Menta' },
  dark: { de: 'Dark', fr: 'Dark', en: 'Dark', it: 'Dark' },
  white: { de: 'Weiß', fr: 'Blanc', en: 'White', it: 'Bianco' },
  black: { de: 'Schwarz', fr: 'Noir', en: 'Black', it: 'Nero' },
  blue: { de: 'Blau', fr: 'Bleu', en: 'Blue', it: 'Blu' },
  navy: { de: 'Marine', fr: 'Marine', en: 'Navy', it: 'Blu navy' },
  yellow: { de: 'Gelb', fr: 'Jaune', en: 'Yellow', it: 'Giallo' },
  pink: { de: 'Pink', fr: 'Rose', en: 'Pink', it: 'Rosa' },
  fuxia: { de: 'Fuchsia', fr: 'Fuchsia', en: 'Fuchsia', it: 'Fucsia' },
  rust: { de: 'Rostrot', fr: 'Rouille', en: 'Rust', it: 'Ruggine' },
  oily: { de: 'Ölfinish', fr: 'Fini huilé', en: 'Oiled finish', it: 'Effetto oliato' },
  bakkar: { de: 'Lack', fr: 'Verni', en: 'Patent', it: 'Vernice' },
  velur: { de: 'Velours', fr: 'Velours', en: 'Suede', it: 'Velluto' },
  lak: { de: 'Lack', fr: 'Verni', en: 'Patent', it: 'Vernice' },
  led: { de: 'LED', fr: 'LED', en: 'LED', it: 'LED' },
  sjaj: { de: 'Glanz', fr: 'Brillant', en: 'Gloss', it: 'Lucido' },
  orlando: { de: 'Orlando', fr: 'Orlando', en: 'Orlando', it: 'Orlando' },
  zmija: { de: 'Schlangenprägung', fr: 'Relief serpent', en: 'Snake emboss', it: 'Stampa serpente' },
  'crna-bakkar': { de: 'Schwarz Lack', fr: 'Noir verni', en: 'Black patent', it: 'Nero verniciato' },
  'bela-bakkar': { de: 'Weiß Lack', fr: 'Blanc verni', en: 'White patent', it: 'Bianco verniciato' },
  'roze-bakkar': { de: 'Rosa Lack', fr: 'Rose verni', en: 'Pink patent', it: 'Rosa verniciato' },
  'crna-lak': { de: 'Schwarz Lack', fr: 'Noir verni', en: 'Black patent', it: 'Nero verniciato' },
  'siva-velur': { de: 'Grau Velours', fr: 'Gris velours', en: 'Grey suede', it: 'Grigio velluto' },
  'zelena-perlato': { de: 'Grün Perlato', fr: 'Vert perlato', en: 'Green perlato', it: 'Verde perlato' },
  'crna-orlando': { de: 'Schwarz Orlando', fr: 'Noir Orlando', en: 'Black Orlando', it: 'Nero Orlando' },
  'braon-orlando': { de: 'Braun Orlando', fr: 'Marron Orlando', en: 'Brown Orlando', it: 'Marrone Orlando' },
  'plava-orlando': { de: 'Blau Orlando', fr: 'Bleu Orlando', en: 'Blue Orlando', it: 'Blu Orlando' },
  'led-orlando': { de: 'LED Orlando', fr: 'LED Orlando', en: 'LED Orlando', it: 'LED Orlando' },
  'zlato-zmija': { de: 'Gold Schlangenprägung', fr: 'Or relief serpent', en: 'Gold snake', it: 'Oro serpente' },
  'roze-zmija': { de: 'Rosa Schlangenprägung', fr: 'Rose relief serpent', en: 'Pink snake', it: 'Rosa serpente' },
  'bela-zmija': { de: 'Weiß Schlangenprägung', fr: 'Blanc relief serpent', en: 'White snake', it: 'Bianco serpente' },
  'zlato-sjaj': { de: 'Gold Glanz', fr: 'Or brillant', en: 'Gold gloss', it: 'Oro lucido' },
  'crna-sjaj': { de: 'Schwarz Glanz', fr: 'Noir brillant', en: 'Black gloss', it: 'Nero lucido' },
  'teget-bakkar': { de: 'Anthrazit Lack', fr: 'Anthracite verni', en: 'Charcoal patent', it: 'Antracite verniciato' },
  'zuta-velur': { de: 'Gelb Velours', fr: 'Jaune velours', en: 'Yellow suede', it: 'Giallo velluto' },
  'roze-velur': { de: 'Rosa Velours', fr: 'Rose velours', en: 'Pink suede', it: 'Rosa velluto' },
  'tamno-siva': { de: 'Dunkelgrau', fr: 'Gris foncé', en: 'Dark Grey', it: 'Grigio scuro' },
  'tamno-braon': { de: 'Dunkelbraun', fr: 'Marron foncé', en: 'Dark Brown', it: 'Marrone scuro' },
};

export function pathSlugFromLeonUrl(url: string): string {
  const m = String(url).match(/\/p\/([^/]+)\/?$/i);
  return m ? m[1].toLowerCase() : '';
}

/** Model lines where „bakkar“ is part of the name, not a colour token (LEONA BAKKAR ≠ LEONA). */
const LEON_MODEL_LINE_PREFIXES = [
  'leona-bakkar',
  'bakkar-ii',
  'bakkar-iii',
  'bakkar-iv',
  'bakkar-v',
] as const;

/** LEON typo slugs → canonical model line (orbira-mink → orbita). */
const LEON_LINE_SLUG_ALIASES: Record<string, string> = {
  orbira: 'orbita',
  liena: 'linea',
};

export function leonProductLineSlugFromPath(fullSlug: string): string {
  const s = fullSlug.toLowerCase().trim();
  for (const prefix of LEON_MODEL_LINE_PREFIXES) {
    if (s === prefix || s.startsWith(`${prefix}-`)) return prefix;
  }
  const line = stripColorsFromPathSlug(s) || s;
  return LEON_LINE_SLUG_ALIASES[line] ?? line;
}

export function stripColorsFromPathSlug(fullSlug: string): string {
  const parts = fullSlug.split('-').filter(Boolean);
  if (!parts.length) return fullSlug;
  const stripped = leonStripColorSuffixParts(parts);
  const joined = stripped.join('-');
  return joined || fullSlug;
}

export function colorTailFromPathSlug(fullSlug: string, strippedSlug: string): string | null {
  if (!fullSlug || fullSlug === strippedSlug) return null;
  if (fullSlug.startsWith(strippedSlug + '-')) return fullSlug.slice(strippedSlug.length + 1);
  return null;
}

/**
 * Canonical model line for grouping colour variants (uses LEON product URL, not primary image —
 * fixes wrong hero image CDN codes like 6301-* vs Freya-*).
 */
export function leonModelGroupBaseFromLeonUrl(url: string | undefined): string | null {
  if (!url) return null;
  const full = pathSlugFromLeonUrl(url);
  if (!full) return null;
  const out = leonProductLineSlugFromPath(full).trim();
  return out.length ? out : null;
}

function stripTrailingVariantIndexParts(parts: string[]): string[] {
  const out = [...parts];
  while (out.length > 1 && /^\d{1,2}$/.test(out[out.length - 1] ?? '')) out.pop();
  return out;
}

/** LEON colour token (BEZ, ROZE BAKKAR, …) → shop language for swatches / UI. */
export function leonColorLabelForLocale(
  rawLabel: string | undefined,
  loc: Loc
): string | null {
  if (!rawLabel?.trim()) return null;
  const slug = normalizeLeonColorSlugKey(rawLabel).replace(/\s+/g, '-').replace(/-+/g, '-');
  return colorSlugToLocales(slug)[loc];
}

function colorSlugToLocales(colorSlug: string): Record<Loc, string> {
  const k = normalizeLeonColorSlugKey(colorSlug).replace(/\s+/g, '-').replace(/-+/g, '-');
  let parts = k.split('-').filter(Boolean).map((p) => normalizeLeonColorSlugKey(p));
  parts = stripTrailingVariantIndexParts(parts);
  const kStripped = parts.join('-');
  if (LEON_COLOR_TO_LOCALE[kStripped]) return LEON_COLOR_TO_LOCALE[kStripped];
  if (LEON_COLOR_TO_LOCALE[k]) return LEON_COLOR_TO_LOCALE[k];
  if (parts.length > 1) {
    const joined = parts.join('-');
    if (LEON_COLOR_TO_LOCALE[joined]) return LEON_COLOR_TO_LOCALE[joined];
    if (parts.every((p) => LEON_COLOR_TO_LOCALE[p])) {
      return {
        de: parts.map((p) => LEON_COLOR_TO_LOCALE[p].de).join(' '),
        fr: parts.map((p) => LEON_COLOR_TO_LOCALE[p].fr).join(' '),
        en: parts.map((p) => LEON_COLOR_TO_LOCALE[p].en).join(' '),
        it: parts.map((p) => LEON_COLOR_TO_LOCALE[p].it).join(' '),
      };
    }
  }
  return prettyInternationalWords(parts.length ? parts.join(' ') : k.replace(/-/g, ' '));
}

function prettyInternationalWords(s: string): Record<Loc, string> {
  const w = s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const low = t.toLowerCase();
      if (ROMAN[low]) return ROMAN[low];
      if (/^\d+[m]?$/i.test(t)) return t.replace(/m$/i, 'M');
      if (/^\d+$/.test(t)) return t;
      return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    })
    .join(' ');
  return { de: w, fr: w, en: w, it: w };
}

/** Localised marketing line for slug bases that still contain Serbian segments. */
function slugBaseToLocales(slugBase: string): Record<Loc, string> {
  const s = slugBase.toLowerCase().trim();
  if (!s) return { de: 'Modell', fr: 'Modèle', en: 'Model', it: 'Modello' };

  const m050 = /^kucna-papuca-(\d{3})$/.exec(s);
  if (m050) {
    const n = m050[1];
    return {
      de: `Hausschuh Home ${n}`,
      fr: `Chausson d'intérieur ${n}`,
      en: `House slipper ${n}`,
      it: `Pantofola da casa ${n}`,
    };
  }
  if (s.startsWith('kucna-papuca-n-')) {
    const rest = s.replace(/^kucna-papuca-n-/, '').replace(/-/g, ' ');
    const r = prettyInternationalWords(rest).en;
    return {
      de: `Hausschuh Home N ${r}`,
      fr: `Chausson d'intérieur N ${r}`,
      en: `House slipper N ${r}`,
      it: `Pantofola da casa N ${r}`,
    };
  }
  if (s.startsWith('zenska-klompa-')) {
    const rest = s.slice('zenska-klompa-'.length).replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `Damen-Clog ${label}`,
      fr: `Sabots femme ${label}`,
      en: `Women's clog ${label}`,
      it: `Zoccolo da donna ${label}`,
    };
  }
  if (s.startsWith('zenska-papuca-')) {
    const rest = s.slice('zenska-papuca-'.length).replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `Damen-Hausschuh ${label}`,
      fr: `Pantoufles femme ${label}`,
      en: `Women's slipper ${label}`,
      it: `Pantofola da donna ${label}`,
    };
  }
  if (s.startsWith('muska-klompa-') || s.startsWith('muska-papuca-')) {
    const isClog = s.startsWith('muska-klompa-');
    const rest = s.replace(/^muska-(klompa|papuca)-/, '').replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `${isClog ? 'Herren-Clog' : 'Herren-Hausschuh'} ${label}`,
      fr: `${isClog ? 'Sabots homme' : 'Pantoufles homme'} ${label}`,
      en: `${isClog ? "Men's clog" : "Men's slipper"} ${label}`,
      it: `${isClog ? 'Zoccolo uomo' : 'Pantofola uomo'} ${label}`,
    };
  }
  // Kids winter slippers (LEON: decija zimska papuca) — avoid Serbian "zimska papuča" in titles
  if (s === 'decija-zimska-papuca-n') {
    return {
      de: 'Kinder-Winter-Hausschuh N',
      fr: "Chausson d'hiver enfant N",
      en: "Kids' winter slipper N",
      it: 'Pantofola invernale bambini N',
    };
  }
  if (s.startsWith('decija-zimska-papuca-')) {
    const code = s.slice('decija-zimska-papuca-'.length).trim();
    const suffix = code.replace(/-/g, ' ').trim();
    return {
      de: `Kinder-Winter-Hausschuh ${suffix}`,
      fr: `Chausson d'hiver enfant ${suffix}`,
      en: `Kids' winter slipper ${suffix}`,
      it: `Pantofola invernale bambini ${suffix}`,
    };
  }
  if (s.startsWith('decija-patofna')) {
    const line = s.replace(/^decija-/, '');
    const label = prettyInternationalSlugBase(line).en;
    return {
      de: `Kinder-Hausschuh ${label}`,
      fr: `Chausson enfant ${label}`,
      en: `Kids' slipper ${label}`,
      it: `Pantofola bambini ${label}`,
    };
  }
  if (s.startsWith('decija-')) {
    const rest = s.replace(/^decija-/, '').replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `Kinder ${label}`,
      fr: `Enfants ${label}`,
      en: `Kids' ${label}`,
      it: `Bambini ${label}`,
    };
  }
  if (s.startsWith('zimska-klompa-')) {
    const rest = s.slice('zimska-klompa-'.length).replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `Winter-Clog ${label}`,
      fr: `Sabots d'hiver ${label}`,
      en: `Winter clog ${label}`,
      it: `Zoccolo invernale ${label}`,
    };
  }
  if (s.startsWith('zimska-papuca-')) {
    const rest = s.slice('zimska-papuca-'.length).replace(/-/g, ' ');
    const label = prettyInternationalWords(rest).en;
    return {
      de: `Winter-Hausschuh ${label}`,
      fr: `Chausson d'hiver ${label}`,
      en: `Winter slipper ${label}`,
      it: `Pantofola invernale ${label}`,
    };
  }
  return prettyInternationalSlugBase(slugBase);
}

function prettyInternationalSlugBase(slugBase: string): Record<Loc, string> {
  const parts = slugBase.split('-').filter(Boolean);
  const out = parts.map((p) => {
    const low = p.toLowerCase();
    if (ROMAN[low]) return ROMAN[low];
    if (/^\d+m$/i.test(p)) return `${p.slice(0, -1)}M`;
    if (/^\d+$/.test(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  });
  const line = out.join(' ');
  return { de: line, fr: line, en: line, it: line };
}

function parseColorFromLeonTitle(title: string): string | null {
  const segs = title
    .split(/\s*[–—]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (segs.length < 2) return null;
  return segs[segs.length - 1].replace(/\s+/g, ' ').trim();
}

function mergeName(base: Record<Loc, string>, color: Record<Loc, string> | null): Product['name'] {
  if (!color) return { de: base.de, fr: base.fr, en: base.en, it: base.it };
  return {
    de: `${base.de} – ${color.de}`,
    fr: `${base.fr} – ${color.fr}`,
    en: `${base.en} – ${color.en}`,
    it: `${base.it} – ${color.it}`,
  };
}

function modelBaseForDescription(names: Product['name'], loc: Loc): string {
  const n = names[loc];
  const segs = n.split(/\s*[–—]\s*/).map((x) => x.trim()).filter(Boolean);
  if (segs.length <= 1) return n.trim();
  return segs.slice(0, -1).join(' – ');
}

export function buildLocalizedDescriptions(category: CategoryId, names: Product['name']): Product['description'] {
  const b = (loc: Loc) => modelBaseForDescription(names, loc);
  if (category === 'men') {
    return {
      de: `Herrenmodell „${b('de')}“ mit bequemem, anatomischem Fussbett.`,
      fr: `Modèle homme « ${b('fr')} » avec semelle intérieure anatomique confortable.`,
      en: `Men's model "${b('en')}" with a comfortable anatomical footbed.`,
      it: `Modello da uomo «${b('it')}» con plantare anatomico confortevole.`,
    };
  }
  if (category === 'children') {
    return {
      de: `Kindermodell „${b('de')}“ mit rutschfester Sohle – bequem und sicher.`,
      fr: `Modèle enfant « ${b('fr')} » avec semelle antidérapante – confortable et sûr.`,
      en: `Kids' model "${b('en')}" with a non-slip sole – comfy and safe.`,
      it: `Modello per bambini «${b('it')}» con suola antiscivolo – comodo e sicuro.`,
    };
  }
  return {
    de: `Damenmodell „${b('de')}“ mit weichem, anatomischem Fussbett.`,
    fr: `Modèle femme « ${b('fr')} » avec semelle intérieure anatomique douce.`,
    en: `Women's model "${b('en')}" with a soft anatomical footbed.`,
    it: `Modello da donna «${b('it')}» con plantare anatomico morbido.`,
  };
}

export function buildLeonLocalizedProductName(args: {
  rawUrl: string;
  /** Canonical slug base for the whole colour family (same for every variant). */
  modelSlugBase: string;
  /** Raw LEON HTML title (decoded later by caller if needed). */
  rawTitle?: string;
}): Product['name'] {
  const fullSlug = pathSlugFromLeonUrl(args.rawUrl);
  const strippedSelf = leonProductLineSlugFromPath(fullSlug);
  const colorSlug = colorTailFromPathSlug(fullSlug, args.modelSlugBase) ?? colorTailFromPathSlug(fullSlug, strippedSelf);

  let colorLocales: Record<Loc, string> | null = null;
  if (colorSlug) {
    colorLocales = colorSlugToLocales(colorSlug);
  } else if (args.rawTitle) {
    const t = args.rawTitle.replace(/\s+/g, ' ').trim();
    const col = parseColorFromLeonTitle(t);
    if (col) {
      const colNoVariant = col.replace(/\s+\d{1,2}\s*$/, '').trim();
      const asSlug = normalizeLeonColorSlugKey(colNoVariant).replace(/\s+/g, '-').replace(/-+/g, '-');
      colorLocales = colorSlugToLocales(asSlug);
    }
  }

  const baseLocales = slugBaseToLocales(args.modelSlugBase);
  return mergeName(baseLocales, colorLocales);
}
