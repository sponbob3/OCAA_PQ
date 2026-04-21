// OPT-IN backfill script. NOT wired into package.json scripts on purpose.
//
// Purpose: copy the source Excel's original OCAA response-side content from
// data/pel-pqs.json (the `defaults` block) into the DB. This is a one-shot
// migration helper, not part of normal seeding.
//
// When to use it: only when OCAA explicitly wants the prior review cycle's
// responses carried over as a starting point. Normal flow is for users to fill
// responses through the UI; scripts/seed.ts deliberately skips this data.
//
// Safety rules this script follows:
//   - Only touches PQs that are still at NOT_STARTED status.
//   - Only fills fields that are currently null or empty. Never overwrites
//     user-entered content.
//   - Does not change status itself. Users still move each PQ to IN_PROGRESS /
//     COMPLETE / etc. through the UI as they review.
//   - Prints a summary of what it wrote so the change is auditable.
//
// Dry run first:
//   npx tsx scripts/backfill-from-defaults.ts --dry-run
// Then apply:
//   npx tsx scripts/backfill-from-defaults.ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type SeedPQ = {
  pqNo: string;
  defaults: {
    statusOfImplementation: string | null;
    mainResponsibility: string | null;
    partResponsibility: string | null;
    fcl: string | null;
    aw: string | null;
    atc: string | null;
    med: string | null;
    workRequired: string | null;
    briefOnWorkRequired: string | null;
  };
};

type SeedFile = {
  metadata: { audit_area: string };
  pqs: SeedPQ[];
};

const RESPONSE_FIELDS = [
  "statusOfImplementation",
  "mainResponsibility",
  "partResponsibility",
  "fcl",
  "aw",
  "atc",
  "med",
  "workRequired",
  "briefOnWorkRequired",
] as const;

type ResponseField = (typeof RESPONSE_FIELDS)[number];

function isBlank(v: string | null | undefined) {
  return v === null || v === undefined || v.trim() === "";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const seedPath = path.join(process.cwd(), "data", "pel-pqs.json");
  const data: SeedFile = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const defaultsByPq = new Map(data.pqs.map((p) => [p.pqNo, p.defaults]));

  const rows = await prisma.protocolQuestion.findMany({
    where: { status: "NOT_STARTED" },
  });

  let touched = 0;
  let skippedNoDefaults = 0;
  let skippedAllFilled = 0;
  const fieldWrites: Record<ResponseField, number> = Object.fromEntries(
    RESPONSE_FIELDS.map((f) => [f, 0])
  ) as Record<ResponseField, number>;

  for (const row of rows) {
    const d = defaultsByPq.get(row.pqNo);
    if (!d) {
      skippedNoDefaults += 1;
      continue;
    }

    const patch: Partial<Record<ResponseField, string>> = {};
    for (const f of RESPONSE_FIELDS) {
      const current = row[f] as string | null;
      const incoming = d[f];
      if (isBlank(current) && !isBlank(incoming)) {
        patch[f] = incoming as string;
        fieldWrites[f] += 1;
      }
    }

    if (Object.keys(patch).length === 0) {
      skippedAllFilled += 1;
      continue;
    }

    touched += 1;
    if (!dryRun) {
      await prisma.protocolQuestion.update({
        where: { id: row.id },
        data: patch,
      });
    }
  }

  console.log(
    `${dryRun ? "[dry run] " : ""}Backfill summary for audit area ${
      data.metadata.audit_area
    }:`
  );
  console.log(`  PQs at NOT_STARTED scanned: ${rows.length}`);
  console.log(`  PQs updated:                ${touched}`);
  console.log(`  Skipped (no defaults):      ${skippedNoDefaults}`);
  console.log(`  Skipped (nothing to fill):  ${skippedAllFilled}`);
  console.log("  Field write counts:");
  for (const f of RESPONSE_FIELDS) {
    console.log(`    ${f.padEnd(24)} ${fieldWrites[f]}`);
  }
  if (dryRun) {
    console.log("\nDry run only. Re-run without --dry-run to apply.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
