# Izveštaj: uvoz nedostajućih modela sa leon.rs

**Datum:** 2026-05-16  
**Izvor cena:** `Tabela Cene.xlsx` (Maloprodajna cena, CHF)  
**Leon izvor:** [leon.rs](https://leon.rs/)

---

## Rezime

| Kategorija | Broj |
|------------|------|
| Nedostajalo na našem sajtu (iz prethodnog izveštaja) | 47 |
| Pronađeno na leon.rs (pretraga po broju/nazivu) | 40 |
| Novi shop redovi uvezeni (boje grupisane) | **~129** |
| Uklonjeno pogrešnih duplikata (Aura→Laura, Bakkar→Andora) | 10 |
| **Trenutno Leon proizvoda u katalogu** | **411** |
| Još uvek nije rešeno automatski | **6 + ručne provere** |

---

## Uspešno uvezeno sa leon.rs (grupisano po modelu)

Svaki model ima `modelGroupId` (iste boje na jednoj PDP grupi) i **Excel maloprodajnu cenu (CHF)** na svim varijantama.

| Excel naziv | Broj | CHF | Boje (slug na leon.rs) |
|-------------|------|-----|-------------------------|
| Anchor | 6016 | 87 | anchor-crna, -braon, -zelena, -mink |
| Strata | 6017 | 87 | strata-crna, -bez |
| Axis | 7032 | 59 | axis-zlatna, -led, -bez, -crna |
| Halo | 7012 | 69 | halo-zlatna, -zelena, -braon |
| Avera | 7022 | 59 | avera-crna, -bez |
| Plain | 7031 | 59 | plain-bez, -crna |
| Edge | 4016 | 79 | edge-braon, -siva, -crna, -bordo |
| Orbita | 4015 | 79 | orbita-siva, -bordo, -braon, -zelena, -tamno-braon, -crna |
| Aura | 4014 | 69 | aura-roze, aura-zelena *(Laura varijante uklonjene)* |
| Motio | 511 | 49 | motio-zelena, -led, -crna, -bez |
| Moveo | 520 | 53 | moveo-led, -crna, -bez |
| Moss | 917 | 49 | moss-siva, -zelena, -braon, -crna |
| Felx | 310 | 59 | felx-crna, -bez |
| Calm | 320 | 59 | calm-bez, -crna |
| Melt | 302 | 60 | melt-led, -crna, -bez |
| Pure | 940 | 49 | pure-* (3 boje) |
| Forge | 7002 | 59 | forge-* (2 boje) |
| Here | 8003 | 49 | here-* (3 boje) |
| Virea | 8004 | 59 | virea-* (3 boje) |
| Serene | 1132 | 59 | serene-* (3 boje) |
| Grace | 1131 | 59 | grace-* (3 boje) |
| Rise | 1112 | 59 | rise-* (3 boje) |
| Eleve | 1111 | 59 | eleve-* (2 boje) |
| Root | 4307 | 59 | root-* (3 boje) |
| Even | 937 | 59 | even-* (2 boje) |
| Stella 2 | 4812 | 49 | stella-ii-zlatna, -roze |
| Stella 1 | 4811 | 49 | stella-i-zlatna, -roze |
| Elio | 4813 | 49 | elio-* (5 boja) |
| Nino | 4810 | 49 | nino-* (3 boje) |
| Ridge | 4705M | 89 | ridge-* (3 boje) |
| North | 4701M | 109 | north-* (3 boje) |
| Nora 5 | 5001 | 69 | nora-i/ii/iv varijante (8 boja) |
| Leona Bakkar | 970 | 49 | leona-* bakkar linija (10 boja) |
| Doris | 7080 | 59 | doris-zlatna, -crna |
| Anna Velur | 4010 | 49 | anna-velur-* (6 boja) |
| **Flow** | 500 | 47 | flow-zelena-perlato, -crna, -bela, -perla *(dopuna)* |
| **Line** | 510 | 49 | line-zelena, -braon, -siva *(dopuna)* |
| **Linea** | 8001 | 59 | liena-braon *(linea-bez/zlatna već postoje)* |

Detaljno po slug-u: `data/leon-missing-import.raw.json`, `scripts/leon-targeted-import-log.json`

---

## Već postojalo na sajtu (nije trebalo uvoziti — treba samo mapa cene)

| Excel | Broj | CHF | Napomena |
|-------|------|-----|----------|
| Siena2 | 7011 | 69 | Na sajtu kao **Alpen Komfort** redovi sa slikom `Siena-II-*` (npr. alpen-komfort-63). Treba ručno vezati Excel → te slug-ove i postaviti 69 CHF. |
| Siena 1 | 7010 | 69 | Već mapirano ranije (alpen-komfort-67 …) |
| Andora / Bakkar | 933 | 49 | „Bakkar“ na leon.rs = Andora patent varijante — **već u katalogu** (andora-*-bakkar). Pogrešan uvoz je uklonjen. |
| Zenska Klompa | 5002, 2023, 3300, 300 | različito | Delimično već mapirano u prvom krugu |

---

## Nije pronađeno na leon.rs (zapelo)

Pretraga `?s={broj}&post_type=product` i po nazivu — **nema rezultata**:

| Excel naziv | Broj | CHF |
|-------------|------|-----|
| Muska Klompa | PU101M | 49 |
| Zenska Klompa | PU115 | 39 |
| Zenska Klompa | 3400 | 39 |
| Zenska Klompa | 991 | 49 |
| ~~Rubikon~~ | ~~3500~~ | ~~49~~ | **Rešeno** — SKU `3500` na [leon.rs](https://leon.rs/p/rubicon-teget-bakkar/); na shopu: `alpen-komfort-72/73/76/77`, grupa `leon-mg-rubicon-3500`, **49 CHF** |

**Predlog:** ručno na [leon.rs](https://leon.rs/) proveriti šifru / katalog za PU kodove i Rubicon (3500).

---

## Poznati problemi automatskog mapiranja (proveri ručno)

1. **Line vs Linea** — na leon.rs „Line“ (510) i „Linea“ (8001) dele slične nazive; uvezeno odvojeno nakon dopune.
2. **Aura** — pretraga je privukla Laura boje; pogrešne redove smo uklonili.
3. **Bakkar (933)** — nije zaseban model, već Andora/Rubicon „bakkar“ finish.
4. **Nora 5** — uvezeno više generacija (nora-i/ii/iv) — proveri da li Excel misli samo na jednu liniju.
5. **Stella 1 / 2** — oba uvezena; proveri brojeve 4811 vs 4812.

---

## Fajlovi i sledeći koraci

| Fajl | Svrha |
|------|--------|
| `scripts/leon-import-missing-report.json` | Rezultat pretrage leon.rs za svih 46 redova |
| `data/leon-missing-import.raw.json` | Log uvezenih URL-ova i boja |
| `scripts/excel-price-report.md` | Prethodno mapiranje cena |
| `scripts/apply-excel-prices.ts` | Ponovo pokrenuti posle ručnih mapa |

**Na serveru:** Admin → **Catalog sync** da se cene i novi proizvodi upišu u bazu.

**Ponovni uvoz:** `node scripts/leon-import-missing.mjs` (samo ako treba dopuna)
