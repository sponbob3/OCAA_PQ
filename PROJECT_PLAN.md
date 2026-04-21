# USOAP CMA Tracker — Project Plan

## What this is

A web app for the **Oman Civil Aviation Authority (OCAA)** to manage their responses and evidence for the ICAO **Universal Safety Oversight Audit Programme Continuous Monitoring Approach (USOAP CMA)**.

The source of truth is the ICAO Protocol Question (PQ) spreadsheet (`data/PEL_PQs_ATC_14-04-26.xlsx`). This version covers the **Personnel Licensing (PEL)** audit area with 100 PQs across 7 Critical Elements (CE-2 through CE-8). Later versions will likely cover the other 7 USOAP audit areas (LEG, ORG, AIR, OPS, ANS, AGA, AIG), so the data model should stay generic.

## Domain primer (read this before coding)

- **USOAP CMA** — ICAO's continuous audit program for how well a state oversees aviation safety.
- **Audit areas (8 total)** — LEG, ORG, PEL, OPS, AIR, AIG, ANS, AGA. This project currently holds PEL data.
- **Critical Elements (CEs)** — 8 building blocks of a state safety oversight system:
  - CE-1: Primary aviation legislation
  - CE-2: Specific operating regulations
  - CE-3: State system and functions
  - CE-4: Qualified technical personnel
  - CE-5: Technical guidance, tools and safety-critical information
  - CE-6: Licensing, certification, authorization and approval
  - CE-7: Surveillance obligations
  - CE-8: Resolution of safety concerns
- **Protocol Question (PQ)** — a single audit question (e.g. "Has the State promulgated specific operating regulations to transpose the provisions of Annex 1?"). Each PQ is tagged to exactly one CE.
- **PPQ** — Priority Protocol Question. A subset of PQs that ICAO has flagged as high-priority. In this file, 34 of 100 PQs are PPQs.
- **PEL sub-areas** — within Personnel Licensing, the spreadsheet has four sub-area columns:
  - **FCL** — Flight Crew Licensing
  - **AW** — Airworthiness personnel (aircraft maintenance technicians)
  - **ATC** — Air Traffic Controllers
  - **MED** — Medical examiners / assessment
- **SRD** — Safety Regulation Department (internal OCAA unit named in the sheet).

## Source spreadsheet structure

| Col | Field | Side | Meaning |
|-----|-------|------|---------|
| A | PQ No. | Placeholder (ICAO) | e.g. "3.001" |
| B | CE | Placeholder | CE-2 .. CE-8 |
| C | Protocol Question | Placeholder | The audit question |
| D | Guidance for Review of Evidence | Placeholder | Multiple bullets, one per row |
| E | ICAO References | Placeholder | Annex / Doc references |
| F | PPQ | Placeholder | "PPQ" marker or blank |
| G | Description of Amendment | Placeholder | What changed in the PQ this cycle |
| H | Status of Implementation | **Input** | Text, e.g. "Satisfactory. To be reviewed" |
| I | Main PQ responsibility | Input | Owning unit, e.g. "PEL" |
| J | FCL | Input | Sub-area response |
| K | AW | Input | Sub-area response |
| L | ATC | Input | Sub-area response |
| M | MED | Input | Sub-area response |
| N | Part responsibility | Input | Supporting unit, e.g. "SRD" |
| O | WORK REQUIRED (Recommendations) | Input | What work is needed |
| P | BRIEF ON THE WORK REQUIRED | Input | Narrative response / evidence description |

Rows A through G are the **immutable question side** (ICAO owns these). Rows H through P are the **response side** (OCAA owns these).

In the raw Excel, guidance bullets and ICAO references span multiple rows per PQ. The seed script (`scripts/import-excel.ts` or the pre-baked `data/pel-pqs.json`) already flattens these into arrays per PQ.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Prisma** ORM with **Postgres** (local dev via `docker-compose.yml` or Postgres.app; prod via Vercel Postgres / Neon / Supabase)
- **shadcn/ui** components (add as needed)
- **Lucide** icons
- Deployment: Vercel (matches R's existing BattleMap setup)

## Data model (Prisma)

See `prisma/schema.prisma` for the full schema. Core entities:

- **ProtocolQuestion** — one row per PQ. Holds both the ICAO fields (question, guidance, refs, CE, PPQ flag) and the OCAA response fields. Guidance and references are stored as JSON-encoded strings (not `text[]` / `jsonb`) because they're small, write-once on seed, and never queried into.
- **EvidenceLink** — attached to a PQ. URL + label + optional description. A PQ can have many.
- **StatusHistory** — audit trail. Every status change logs who, when, from what to what, with optional note.
- **User** — lightweight user model for attribution. Auth can come later (NextAuth with Azure AD or a single-tenant email login are both reasonable).

## Status taxonomy

Five states. Do not add more without thinking about the progress math.

| Code | Label | Counts toward "complete" |
|------|-------|--------------------------|
| `NOT_STARTED` | Not started | No |
| `IN_PROGRESS` | In progress | No |
| `NEEDS_WORK` | Needs work | No |
| `UNDER_REVIEW` | Under review | No |
| `COMPLETE` | Complete | Yes |

Progress % for a CE = (COMPLETE PQs in that CE) / (total PQs in that CE).
Overall progress = (COMPLETE PQs) / (total PQs).

## Pages to build

Already scaffolded:
- `/` — Dashboard. KPI cards (overall progress, PPQ progress, needs attention), status breakdown bar, and a per-CE progress list.
- `/pqs` — PQ list. Filterable by CE, status, PPQ, and text search. Sortable by PQ number, status, or CE. All filters use URL query params so links are shareable.
- `/pqs/[pqNo]` — PQ detail. Read-only ICAO question side (guidance, references, amendment) on top, editable OCAA response form below, plus evidence link management and a status-change audit trail.
- `/ces/[ceId]` — Per-CE view. Scoped list of all PQs in that CE with CE-level progress bar.
- `/api/pqs/[pqNo]` — GET / PATCH for the OCAA response fields. Auto-logs to `StatusHistory` when status changes.
- `/api/pqs/[pqNo]/evidence` — POST / DELETE for evidence links.

Nice to add next (not yet scaffolded):
- Export to Excel (so OCAA can hand ICAO a filled-out version of the original sheet).
- Bulk status update from the list page.
- Comments thread per PQ.
- Basic auth with role-based permissions (Admin, Editor, Viewer). The `User` model and `updatedBy` / `changedBy` relations are already wired, just need NextAuth on top.
- Recharts pie/bar charts on the dashboard for status breakdown.
- File uploads (to replace or complement URL-only evidence links).

## How to get going in Cursor

```bash
cd usoap-tracker
cp .env.example .env
docker compose up -d          # or point .env at any reachable Postgres
npm install
npx prisma migrate deploy
npm run seed                  # populates Postgres from data/pel-pqs.json (ICAO fields only)
npm run dev
```

Open http://localhost:3000.

## Next steps priority order for Cursor

1. Run the install + migrate + seed flow above and confirm the dashboard loads at localhost:3000.
2. Click through a PQ detail page, change its status, add an evidence link, reload. Verify the audit trail populates.
3. Add basic auth (NextAuth credentials provider is fine as a starting point) and wire `updatedById` into the API routes.
4. Add Excel export that mirrors the original column layout, so OCAA can hand ICAO a filled-out spreadsheet.
5. Add file upload support to evidence links (S3 or Vercel Blob).
6. Polish the dashboard with recharts pie/bar charts for status breakdown.
7. Extend the import path for the other 7 audit areas (LEG, ORG, OPS, AIR, AIG, ANS, AGA) when those spreadsheets arrive. The schema already supports `auditArea` per PQ, just need to update `scripts/import-excel.ts` to accept a file argument and tag rows.
