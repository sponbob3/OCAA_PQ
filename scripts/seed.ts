// Seeds the DB from data/pel-pqs.json. Safe to run multiple times: uses upsert.
//
// Only the ICAO-owned (immutable) side of each PQ is written: pqNo, ce, question,
// guidance, icaoReferences, isPPQ, isATC, amendmentDescription, auditArea.
//
// The `defaults` block in pel-pqs.json preserves the source Excel's original
// response-side content (columns H, I, N, O, P) for future reference or optional
// import. It is intentionally NOT seeded into the DB. The app starts empty and
// OCAA fills responses through the UI so the dashboard reflects the current
// review cycle, not last cycle's carryover.
//
// If you ever want to pull the Excel responses in as a starting point, use the
// opt-in script at scripts/backfill-from-defaults.ts. Do not re-enable the
// defaults import here.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type SeedPQ = {
  pqNo: string;
  ce: string;
  question: string;
  guidance: string[];
  icaoReferences: string[];
  isPPQ: boolean;
  isATC?: boolean;
  amendmentDescription: string | null;
  defaults: {
    statusOfImplementation: string | null;
    mainResponsibility: string | null;
    partResponsibility: string | null;
    fcl: string | null;
    aw: string | null;
    atc: string | null;
    med: string | null;
    foo: string | null;
    sms: string | null;
    workRequired: string | null;
    briefOnWorkRequired: string | null;
  };
};

type SeedFile = {
  metadata: { audit_area: string };
  pqs: SeedPQ[];
};

async function main() {
  const seedPath = path.join(process.cwd(), "data", "pel-pqs.json");
  const raw = fs.readFileSync(seedPath, "utf8");
  const data: SeedFile = JSON.parse(raw);

  console.log(`Seeding ${data.pqs.length} PQs for audit area ${data.metadata.audit_area}...`);

  for (const pq of data.pqs) {
    const icaoFields = {
      auditArea: data.metadata.audit_area,
      ce: pq.ce,
      question: pq.question,
      guidanceJson: JSON.stringify(pq.guidance),
      icaoReferencesJson: JSON.stringify(pq.icaoReferences),
      isPPQ: pq.isPPQ,
      isATC: pq.isATC ?? false,
      amendmentDescription: pq.amendmentDescription,
    };

    await prisma.protocolQuestion.upsert({
      where: { pqNo: pq.pqNo },
      create: {
        pqNo: pq.pqNo,
        ...icaoFields,
        // Response-side fields intentionally omitted. Status defaults to
        // NOT_STARTED via the schema; all others default to null.
      },
      update: icaoFields,
    });
  }

  const total = await prisma.protocolQuestion.count();
  console.log(`Done. ${total} PQs in DB.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
