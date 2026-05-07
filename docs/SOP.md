# Database SOP (Simple)

This is the standard way to work with this project.

## 1) Normal deploy (daily use)

Use this when you changed code and want it live.

```bash
cd /Users/rayyanasim/Documents/usoap_tracker
git add -A
git commit -m "your message"
git push origin main
```

What happens on deploy:
- schema updates run
- app builds
- live submissions stay as they are

## 2) Update static PQ data (only when source sheet changed)

Use this when ICAO/reference fields changed (question text, guidance, ATC mapping, etc.).

```bash
cd /Users/rayyanasim/Documents/usoap_tracker
npm run db:seed:static
npm run db:check:atc
```

## 3) Copy Vercel production data to local (one command)

Use this when you want local to match what is on Vercel.

```bash
cd /Users/rayyanasim/Documents/usoap_tracker
npm run db:sync:prod-to-local
```

Then run:

```bash
npm run dev:clone
```

## 3b) Copy Vercel production data into your main local DB

Use this only if you want your normal local DB (`usoap`) to become the
same as Vercel production.

```bash
cd /Users/rayyanasim/Documents/usoap_tracker
npm run db:sync:prod-to-local:main
```

The command asks for confirmation because it overwrites local DB data.

Then run:

```bash
npm run dev
```

## 4) Everyday local run

If you want your normal local database:

```bash
npm run dev
```

If you want the local copy of Vercel data:

```bash
npm run dev:clone
```

## 5) Important rules

- Do not run reset commands on production by accident.
- Do not mix multiple dev servers on different ports when checking data.
- If something looks wrong, run:

```bash
npm run db:check:atc
```

If this check says 0 ATC rows, run `npm run db:seed:static`.

