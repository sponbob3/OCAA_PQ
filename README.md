# USOAP CMA Tracker

Web app for tracking Oman Civil Aviation Authority responses to ICAO USOAP CMA Protocol Questions.

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for full domain context, data model, and roadmap. Read it before making changes.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma 6 · Postgres.

Dev and prod both run on Postgres. Local dev uses a Postgres container via `docker-compose.yml`; prod uses Vercel Postgres / Neon / Supabase (anything with a `postgresql://` URL).

## Local dev (Docker)

Requires Docker Desktop (or any Docker-compatible runtime) and Node 20+.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Visit http://localhost:3000.

Reset the DB (drop all data, re-apply migrations, reseed):

```bash
npm run db:reset
```

## Local dev (without Docker)

Point `DATABASE_URL` / `DIRECT_URL` in `.env` at any reachable Postgres (Neon free tier works). Then:

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. Create a new Vercel project from the repo. Default build command (`npm run build`) and output work as-is.
3. Provision a Postgres database. Any of these works:
   - Vercel Marketplace → Neon (one-click, free tier).
   - Vercel Postgres.
   - External Neon / Supabase / Railway / Fly Postgres.
4. Add two environment variables in the Vercel project settings:
   - `DATABASE_URL` → the pooled connection string (the one with `-pooler` / `pgbouncer=true`).
   - `DIRECT_URL` → the unpooled connection string (used by Prisma Migrate).
   For Neon both are shown in the dashboard. For Vercel Postgres, `POSTGRES_PRISMA_URL` is the pooled URL and `POSTGRES_URL_NON_POOLING` is the direct URL; alias them to `DATABASE_URL` / `DIRECT_URL`.
5. Deploy. The build runs `prisma generate && next build`.
6. After the first successful deploy, apply migrations once and seed:
   ```bash
   # from your local machine, pointing at the prod DB
   DATABASE_URL="<prod pooled url>" DIRECT_URL="<prod direct url>" npm run db:migrate
   DATABASE_URL="<prod pooled url>" DIRECT_URL="<prod direct url>" npm run seed
   ```
   (Seed is safe to re-run; it upserts by `pqNo` and does not touch OCAA response fields. See `scripts/seed.ts` header.)

Subsequent deploys with schema changes: add a new migration locally with `npx prisma migrate dev --name <change>`, commit, push, then re-run `npm run db:migrate` against prod.

## Data

The seed JSON in `data/pel-pqs.json` is pre-extracted from `data/PEL_PQs_ATC_14-04-26.xlsx` and contains 100 PQs for the Personnel Licensing audit area, grouped into 7 Critical Elements (CE-2 through CE-8). 34 of them are flagged as PPQ (Priority Protocol Questions).

If the source spreadsheet changes, re-run the extractor:

```bash
npm run import-excel
```

`scripts/seed.ts` writes only the ICAO-owned fields (pqNo, CE, question, guidance, etc.). Response-side fields start empty so the app reflects the current review cycle. If you want to carry the prior Excel responses in as a starting point, run the opt-in script:

```bash
npx tsx scripts/backfill-from-defaults.ts --dry-run
npx tsx scripts/backfill-from-defaults.ts
```

## Project layout

```
usoap-tracker/
├── PROJECT_PLAN.md           Full context and roadmap (read this first)
├── docker-compose.yml        Local Postgres
├── data/
│   ├── PEL_PQs_ATC_14-04-26.xlsx   Source spreadsheet (drop here)
│   └── pel-pqs.json                Extracted, normalized seed data
├── prisma/
│   ├── schema.prisma         DB schema
│   └── migrations/           Versioned migrations (Postgres)
├── scripts/
│   ├── import-excel.ts       Re-extract JSON from .xlsx if the source changes
│   ├── seed.ts               Populate DB from pel-pqs.json (ICAO fields only)
│   └── backfill-from-defaults.ts  Opt-in response-field backfill
├── src/
│   ├── app/                  Next.js App Router pages
│   │   ├── page.tsx          Dashboard
│   │   ├── pqs/              PQ list + detail routes
│   │   └── layout.tsx
│   ├── components/           Reusable UI
│   ├── lib/                  db client, types, constants
│   └── types/
```
