const TWO_SUFFIX = new Set(
  [
    'crna-bakkar',
    'bela-bakkar',
    'roze-bakkar',
    'crna-lak',
    'siva-velur',
    'zelena-perlato',
    'crna-orlando',
    'braon-orlando',
    'plava-orlando',
    'led-orlando',
    'zlato-zmija',
    'roze-zmija',
    'bela-zmija',
    'zlato-sjaj',
    'crna-sjaj',
    'teget-bakkar',
    'zuta-velur',
    'roze-velur',
  ].map((s) => s.toLowerCase())
);

const ONE_SUFFIX = new Set(
  [
    'crna',
    'bela',
    'braon',
    'siva',
    'roze',
    'roza',
    'bez',
    'bež',
    'teget',
    'zelena',
    'zlatna',
    'zlato',
    'bordo',
    'perla',
    'perlato',
    'ciklama',
    'ljubicasta',
    'ljubičasta',
    'zuta',
    'maslinasto',
    'plava',
    'crvena',
    'sampanj',
    'mint',
    'dark',
    'white',
    'black',
    'blue',
    'navy',
    'yellow',
    'pink',
    'fuxia',
    'rust',
    'oily',
    'bakkar',
    'velur',
    'lak',
    'sjaj',
    'tbc',
    'puprle',
    'orladno',
  ].map((s) => s.toLowerCase())
);

/** Removes trailing colour / finish tokens from a hyphen-split stem (URL slug or image filename). */
export function leonStripColorSuffixParts(partsIn: string[]): string[] {
  const p = partsIn.map((x) => x.toLowerCase());
  while (p.length > 1) {
    const last = p[p.length - 1];
    // LEON sometimes appends a variant index: adriana-zlato-zmija-2 (not a colour).
    if (/^\d{1,2}$/.test(last)) {
      p.pop();
      continue;
    }
    const prev = p[p.length - 2];
    if (last === 'orlando') {
      p.pop();
      p.pop();
      continue;
    }
    if (last === 'zmija') {
      p.pop();
      p.pop();
      continue;
    }
    if (last === 'sjaj') {
      p.pop();
      p.pop();
      continue;
    }
    const lastTwo = `${prev}-${last}`;
    if (TWO_SUFFIX.has(lastTwo)) {
      p.pop();
      p.pop();
      continue;
    }
    if (ONE_SUFFIX.has(last)) {
      p.pop();
      continue;
    }
    break;
  }
  return p;
}
