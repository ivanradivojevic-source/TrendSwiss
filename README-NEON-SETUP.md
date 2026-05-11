# Neon + Vercel + GitHub (quick setup)

## Neon account: Google vs GitHub?
- **Either is fine**. It doesn't affect your database.
- If you already use GitHub for code + Vercel, **GitHub login** keeps things simple (one identity), but **Google is OK** too.

## Local env vars
Create `.env.local` with:

- `DATABASE_URL=...` (Neon Postgres connection string)
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `RESEND_API_KEY=...` (optional for now)
- `RESEND_FROM_EMAIL=...` (optional)
- `ADMIN_EMAIL=...`
- `ADMIN_PASSWORD=...`
- `ADMIN_AUTH_SECRET=...` (random string)

## Migrate DB (after DATABASE_URL is set)
Run:

```bash
npx prisma migrate dev --name init
```

## Vercel deploy
1. Push code to GitHub
2. Import repo into Vercel
3. Add the same env vars in Vercel Project Settings → Environment Variables
4. Deploy

