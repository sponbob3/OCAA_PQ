// Smoke test for the PEL sub-area revamp.
//
// Runs end-to-end logic without an HTTP server: schema columns,
// resolveEnabledPelSubAreas behavior, enabling/disabling persistence,
// admin-only write gate (simulated by checking what the route would
// have done), and RPL enum acceptance.
//
// Usage: DATABASE_URL=... DIRECT_URL=... npx tsx scripts/smoke-pel-revamp.ts

import { PrismaClient } from "@prisma/client";
import {
  PEL_SUB_AREA_FIELD_KEYS,
  resolveEnabledPelSubAreas,
  stringifyEnabledPelSubAreas,
  parseEnabledPelSubAreas,
  isPelSubAreaField,
} from "../src/lib/pel";
import { listPelSubAreaNames } from "../src/lib/pel-names";

const prisma = new PrismaClient();

function ok(label: string) {
  console.log(`  ok: ${label}`);
}
function fail(label: string): never {
  throw new Error(label);
}

async function main() {
  console.log(`=== smoke: ${process.env.DATABASE_URL?.split("@")[1] ?? ""}`);

  // RPL is in the enum
  if (!PEL_SUB_AREA_FIELD_KEYS.includes("RPL"))
    fail("RPL missing from PEL_SUB_AREA_FIELD_KEYS");
  ok("RPL in PEL_SUB_AREA_FIELD_KEYS");

  // Resolver default behavior
  const derived = resolveEnabledPelSubAreas(null, ["FCL", "ATC"]);
  if (
    derived.length !== 2 ||
    !derived.includes("FCL") ||
    !derived.includes("ATC")
  )
    fail("resolver default derive incorrect");
  ok("resolver derives from existing submissions when JSON is null");

  // Resolver explicit
  const explicit = resolveEnabledPelSubAreas('["RPL","AW"]', ["FCL"]);
  if (
    explicit.length !== 2 ||
    !explicit.includes("RPL") ||
    !explicit.includes("AW")
  )
    fail("resolver explicit incorrect");
  ok("resolver respects explicit JSON over derivation");

  // Round-trip
  const roundTrip = parseEnabledPelSubAreas(
    stringifyEnabledPelSubAreas(["MED", "RPL", "INVALID" as never])
  );
  if (
    !roundTrip ||
    roundTrip.length !== 2 ||
    !roundTrip.includes("MED") ||
    !roundTrip.includes("RPL")
  )
    fail("round trip dropped or added wrong keys");
  ok("round-trip serialization filters out non-PEL keys");

  // Pick a real PQ to exercise the persistence path
  const pq = await prisma.protocolQuestion.findFirst({
    select: { id: true, pqNo: true, enabledPelSubAreasJson: true },
  });
  if (!pq) fail("no PQs in DB");
  console.log(`  using PQ ${pq.pqNo}`);

  const savedJson = pq.enabledPelSubAreasJson;

  try {
    // Persist an RPL-inclusive set and read back
    const targetJson = stringifyEnabledPelSubAreas(["FCL", "RPL"]);
    await prisma.protocolQuestion.update({
      where: { id: pq.id },
      data: { enabledPelSubAreasJson: targetJson },
    });
    const refreshed = await prisma.protocolQuestion.findUnique({
      where: { id: pq.id },
      select: { enabledPelSubAreasJson: true },
    });
    if (refreshed?.enabledPelSubAreasJson !== targetJson)
      fail(`persisted JSON mismatch: ${refreshed?.enabledPelSubAreasJson}`);
    ok("admin enabled-set persists on PQ row");

    // Verify isPelSubAreaField guard
    if (!isPelSubAreaField("RPL")) fail("RPL not detected as PEL sub-area");
    if (isPelSubAreaField("STATUS_OF_IMPLEMENTATION"))
      fail("STATUS_OF_IMPLEMENTATION wrongly detected as PEL sub-area");
    ok("isPelSubAreaField gate works");

    // Confirm RPL FieldKey is accepted at the DB layer (insert + delete a row).
    // Reuse the admin demo user since it's always present (ensureDemoUsers
    // is called from getCurrentUser at runtime). If it's not, we fall back
    // to whatever user exists.
    const importUser =
      (await prisma.user.findUnique({ where: { email: "import@ocaa.om" } })) ??
      (await prisma.user.findUnique({
        where: { email: "asim.mairaj@ocaa.om" },
      })) ??
      (await prisma.user.findFirst());
    if (!importUser) fail("no users in DB to attribute smoke submission to");
    const inserted = await prisma.fieldSubmission.create({
      data: {
        pqId: pq.id,
        fieldKey: "RPL",
        seq: 9999, // out of normal range to avoid collision
        value: "Smoke Test Name",
        authorId: importUser.id,
        isInitial: false,
      },
      select: { id: true, fieldKey: true },
    });
    if (inserted.fieldKey !== "RPL") fail("RPL FieldKey not stored");
    ok("RPL FieldKey writes through the schema");

    // listPelSubAreaNames pulls our inserted name back
    const names = await listPelSubAreaNames();
    if (!names.includes("Smoke Test Name"))
      fail("listPelSubAreaNames missing the inserted name");
    ok(`listPelSubAreaNames returns ${names.length} distinct names`);

    // Cleanup the smoke submission
    await prisma.fieldSubmission.delete({ where: { id: inserted.id } });
    ok("cleanup ok");
  } finally {
    // Restore the original enabled JSON, whatever it was
    await prisma.protocolQuestion.update({
      where: { id: pq.id },
      data: { enabledPelSubAreasJson: savedJson },
    });
    console.log("  restored original enabledPelSubAreasJson");
  }

  console.log("all good");
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
