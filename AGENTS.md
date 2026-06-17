# TrendSwiss — uputstvo za AI agenta

Ovaj fajl je kratak indeks. **Trajna pravila** su u `.cursor/rules/` i učitavaju se automatski u Cursor chatu.

## Pravila (`.cursor/rules/`)

| Fajl | Kada važi |
|------|-----------|
| `trendswiss-core.mdc` | **Uvek** — stack, dev, git, ključni fajlovi |
| `agent-workflow.mdc` | **Uvek** — kako raditi zadatke, PowerShell, commit politika |
| `github-deploy.mdc` | **Uvek** — upload na GitHub: Ivan daje samo commit tekst, agent radi status → add → commit → push |
| `leon-catalog.mdc` | Leon katalog, patch skripte, kategorije |
| `i18n-ui.mdc` | Prevodi (`messages/`) i React komponente |

## Brzi start

```bash
npm install
npm run dev    # http://localhost:3000
```

## Najčešći zadaci

1. **Pogrešna kategorija po šifri** → `src/lib/exploreClassifier.ts` + tagovi u patch skripti
2. **Mešane slike na PDP** → nova/izmenjena `scripts/patch-*.mjs`, fetch leon.rs, filter galerije
3. **Novi UI tekst** → sva 4 `messages/{de,en,fr,it}.json`
4. **Deploy na GitHub** → Ivan pošalje samo commit tekst; agent prati `github-deploy.mdc` (status → add → commit → push na `main`, Vercel auto-build)

## Kontakt / About tekst
Sekcija `#about` na `app/[locale]/page.tsx`, prevodi pod `home.about*` u messages.
