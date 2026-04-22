// Wipes all manual experimentation from the DB, keeping only the
// immutable initial template that came from the source workbook.
//
// What gets removed:
//   - Every FieldSubmission where isInitial = false (i.e. everything a
//     user typed into the UI or imported outside the template path).
//   - Every EvidenceLink. The template import does not create evidence
//     rows, so all evidence is user-supplied experimental content.
//   - Every StatusHistory row EXCEPT the ones whose note starts with
//     "Initial import from source workbook" (those are paired with
//     isInitial submissions and represent the template's own status
//     inference).
//
// What stays:
//   - All FieldSubmission rows with isInitial = true.
//   - The paired StatusHistory rows from the initial import.
//   - ProtocolQuestion.status is then recomputed from the initial
//     template so a PQ ends up exactly where the template placed it:
//     COMPLETE (100% in source), UNDER_REVIEW (<100% in source),
//     IN_PROGRESS (has initial rows but no % in source), or
//     NOT_STARTED (no initial rows at all).
//
// Safety:
//   - Wrapped in a single transaction so a failure leaves the DB
//     untouched.
//   - --dry-run prints what it would do without touching anything.
//
// Dry run: npx tsx scripts/reset-to-initial.ts --dry-run
// Apply:   npx tsx scripts/reset-to-initial.ts
import { PrismaClient, type Status } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { ensureDemoUsers } from "../src/lib/current-user";

const prisma = new PrismaClient();

type SeedPQ = {
  pqNo: string;
  sourceMeta?: { progressPct: number | null };
};

type SeedFile = { pqs: SeedPQ[] };

function inferStatus(
  progressPct: number | null,
  hasInitialSubmissions: boolean
): Status {
  if (progressPct != null) {
    if (progressPct >= 100) return "COMPLETE";
    return "UNDER_REVIEW";
  }
  return hasInitialSubmissions ? "IN_PROGRESS" : "NOT_STARTED";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await ensureDemoUsers();

  const seedPath = path.join(process.cwd(), "data", "pel-pqs.json");
  const data: SeedFile = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const progressByPq = new Map(
    data.pqs.map((p) => [p.pqNo, p.sourceMeta?.progressPct ?? null])
  );

  // Snapshot counts before any changes so the summary is meaningful.
  const [
    totalSubs,
    initialSubs,
    totalEvidence,
    totalHistory,
  ] = await Promise.all([
    prisma.fieldSubmission.count(),
    prisma.fieldSubmission.count({ where: { isInitial: true } }),
    prisma.evidenceLink.count(),
    prisma.statusHistory.count(),
  ]);

  const manualSubs = totalSubs - initialSubs;

  console.log(`${dryRun ? "[dry run] " : ""}Current state:`);
  console.log(`  FieldSubmission total:    ${totalSubs}`);
  console.log(`    isInitial (protected):  ${initialSubs}`);
  console.log(`    manual (will wipe):     ${manualSubs}`);
  console.log(`  EvidenceLink total:       ${totalEvidence} (all will wipe)`);
  console.log(`  StatusHistory total:      ${totalHistory}`);

  if (dryRun) {
    console.log("\nDry run only. Re-run without --dry-run to apply.");
    return;
  }

  // Actual reset. Everything runs inside one transaction so a partial
  // failure leaves the DB in its previous state.
  await prisma.$transaction(async (tx) => {
    await tx.fieldSubmission.deleteMany({ where: { isInitial: false } });
    await tx.evidenceLink.deleteMany({});
    // Keep only status history rows that describe the initial-import
    // auto-transitions. Any manual transition (user actions) is wiped.
    await tx.statusHistory.deleteMany({
      where: {
        NOT: { note: { startsWith: "Initial import from source workbook" } },
      },
    });

    // Recompute status per PQ from the initial template.
    const pqs = await tx.protocolQuestion.findMany({
      select: { id: true, pqNo: true, status: true },
    });
    const subsByPq = await tx.fieldSubmission.groupBy({
      by: ["pqId"],
      where: { isInitial: true },
      _count: { _all: true },
    });
    const hasInitialByPq = new Map(
      subsByPq.map((r) => [r.pqId, r._count._all > 0])
    );

    for (const pq of pqs) {
      const pct = progressByPq.get(pq.pqNo) ?? null;
      const hasInitial = hasInitialByPq.get(pq.id) ?? false;
      const target = inferStatus(pct, hasInitial);
      if (target !== pq.status) {
        await tx.protocolQuestion.update({
          where: { id: pq.id },
          data: { status: target },
        });
      }
    }
  });

  const [afterSubs, afterHistory] = await Promise.all([
    prisma.fieldSubmission.count(),
    prisma.statusHistory.count(),
  ]);

  console.log("\nDone. After reset:");
  console.log(`  FieldSubmission total:    ${afterSubs}`);
  console.log(`  EvidenceLink total:       0`);
  console.log(`  StatusHistory total:      ${afterHistory}`);
  console.log(
    "  PQ statuses recomputed from the initial template."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
