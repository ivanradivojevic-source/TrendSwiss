# Swiss Trend Shop

Online shop za Švajcarsku – katalog proizvoda, korpa, Stripe plaćanje, višejezičnost (DE/FR/EN), vauceri.

## Pokretanje

```bash
npm install
cp .env.example .env
# Popuni .env (Stripe test ključevi, opciono Resend za e-mail)
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) – biće preusmeren na `/de`.

## Funkcionalnosti

- **Katalog**: proizvodi u `data/products.ts` (primer: papuče sa veličinama i bojama)
- **Korpa**: dodavanje u korpu, promena količine, bez korisničkog naloga
- **Jezici**: švajcarski nemački (DE), francuski (FR), engleski (EN) – preko dropdown-a sa zastavama u headeru
- **Plaćanje**: Stripe Checkout (test režim); po uspešnoj uplati webhook šalje e-mail na adresu kupca (preko Resend)
- **Vauceri**: kodovi u `data/vouchers.ts` (npr. WELCOME10, SWISS20, CHF5OFF)

## TLS i Cloudflare

Da bi sajt imao TLS i Cloudflare kao međusloj između korisnika i servera:

1. **Domen**: Poveži domen na Cloudflare (DNS preko Cloudflare).
2. **SSL/TLS**: U Cloudflare Dashboard → SSL/TLS postavi na **Full (strict)** da se koristi šifrovanje do origin servera.
3. **Proxy**: Uključi „Proxied” (narančasti oblak) za A/CNAME zapise da sav saobraćaj ide kroz Cloudflare (DDoS zaštita, keš, TLS).
4. **Origin**: Sajt može da bude hostovan na Vercel, Cloudflare Pages ili bilo kom VPS-u; dovoljno je da podržava HTTPS kada Cloudflare proverava origin.

Kod sam ne menja – TLS i Cloudflare su konfiguracija na nivou DNS/hostinga.

## Stripe (test)

1. Nalog na [stripe.com](https://stripe.com), Test mode uključen.
2. U **Developers → API keys** kopiraj **Secret key** (sk_test_...) u `STRIPE_SECRET_KEY`.
3. Webhook za „Payment successful” i slanje e-maila:
   - Lokalno: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
   - Kopiraj **Signing secret** (whsec_...) u `STRIPE_WEBHOOK_SECRET`.
   - Na produkciji: **Developers → Webhooks → Add endpoint**, URL npr. `https://tvoj-domen.ch/api/webhooks/stripe`, event `checkout.session.completed`.
4. Test kartice: npr. `4242 4242 4242 4242`, bilo koji budući datum i CVC.

## E-mail (Resend)

Za „Payment successful” poruku na e-mail kupca:

1. Nalog na [resend.com](https://resend.com).
2. API key u `RESEND_API_KEY`, po želji `RESEND_FROM_EMAIL` (verifikovan domen za produkciju).

Ako `RESEND_API_KEY` nije postavljen, webhook i dalje radi (loguje uspeh), samo se e-mail ne šalje.

## Dodavanje i izmena proizvoda

### Sada (bez CMS-a)

- **Proizvodi**: fajl `data/products.ts`. Za svaki proizvod: `id`, `slug`, `name` (de/fr/en), `description`, `image` (URL ili putanja u `public/`), `sizes`, `colors`, `variants` (cena po kombinaciji veličine/boje).
- **Slike**: stavi u `public/products/` (npr. `public/products/papuce-1.jpg`) i u proizvodu stavi `image: '/products/papuce-1.jpg'`. Ili koristi eksterne URL-ove (dodaj domen u `next.config.js` ako koristiš `next/image`).
- **Cene**: u `variants` svaki red ima `priceCHF` (u CHF).
- **Vauceri**: `data/vouchers.ts` – dodaj nove kodove (`code`, `type`: `percent` ili `fixed`, `value`, opciono `minOrderCHF`).

Ovo može da menja bilo ko ko ima pristup repozitorijumu ili serveru.

### Kasnije (lakše za ne-tehničkog korisnika)

Da bi neko drugi lako dodavao proizvode, slike i cene bez koda:

1. **Admin panel**: moguće je dodati zaštićenu stranicu (npr. `/admin`) sa formama za proizvode i vaucere, sa jednostavnom lozinkom (env var). Podaci se mogu pisati u isti `data/products.ts` (na serveru) ili u bazu/JSON fajl.
2. **Headless CMS**: Strapi, Sanity ili Contentful – model „Product” sa poljima (naziv, opis, slike, cene, varijante). Sajt onda čita API CMS-a umesto `data/products.ts`. CMS ima svoj UI za uređivanje, pa drugi korisnici mogu da dodaju proizvode bez koda.

Za test papuča sada je dovoljno menjati `data/products.ts` i `data/vouchers.ts`.

## Struktura projekta

- `app/[locale]/` – stranice po jeziku (de, fr, en)
- `components/` – Header (logo, nav, jezik, korpa), LocaleSwitcher, CartContent, AddToCartForm, Footer
- `data/products.ts` – katalog proizvoda
- `data/vouchers.ts` – kodovi i popusti
- `store/cart-store.ts` – Zustand korpa (persist u localStorage)
- `app/api/checkout/route.ts` – kreiranje Stripe Checkout sesije
- `app/api/webhooks/stripe/route.ts` – webhook za `checkout.session.completed`, slanje e-maila
- `messages/` – prevodi (de.json, fr.json, en.json)

## Skripte

- `npm run dev` – development
- `npm run build` – build za produkciju
- `npm run start` – start produkcijskog builda
