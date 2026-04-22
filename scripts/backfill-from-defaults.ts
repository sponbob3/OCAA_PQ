// Imports the original Excel workbook content into the live DB as the
// immutable "initial template" for every PQ.
//
// Unlike a normal submission, rows written by this script are flagged
// isInitial = true. They:
//   - appear in the UI with an "Initial" timestamp (no relative time)
//     and, where attribution is missing, are shown as "Initial input"
//     instead of being attributed to the sentinel user.
//   - cannot be deleted through the UI or API; admins must revise them.
//   - are preserved by scripts/reset-to-initial.ts, which wipes all
//     manual experimentation without touching the template.
//
// Attribution strategy:
//   - Main-block fields (status of implementation, responsibilities,
//     PEL sub-areas, work required, etc.) have NO author information
//     in the source workbook. They are stored against the sentinel
//     IMPORT_USER with no label, and the UI renders them as
//     "Initial input".
//   - Internal notes are the exception: entries in Sheet1 column T
//     carry a parenthetical "(Name)" at the end. That name IS author
//     metadata and is preserved:
//       * "Asim" → real admin user (DEMO_USERS[0]), full admin styling.
//       * Any other name → sentinel IMPORT_USER, authorLabel = the
//         name, no admin styling.
//
// Status inference (from Sheet1 column V, normalized to 0-100):
//   - 100 → COMPLETE
//   - any other non-null value → UNDER_REVIEW
//   - null but at least one submission was created → IN_PROGRESS
//   - null and no submissions → leave PQ alone (stays NOT_STARTED)
// A StatusHistory row is written for every real transition so the audit
// log shows where the value came from.
//
// Safety rules:
//   - Idempotent: only creates a submission when the (pq, field) thread
//     is empty. Re-running touches nothing once the template is in.
//   - Does not overwrite or reattribute any existing submission.
//   - Only applies the status inference when NO submission existed for
//     the PQ before this run (i.e. during the initial import). On
//     re-runs nothing is changed.
//
// Dry run:   npx tsx scripts/backfill-from-defaults.ts --dry-run
// Apply:     npx tsx scripts/backfill-from-defaults.ts
import {
  PrismaClient,
  type FieldKey,
  type Status,
} from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_USER_ID, DEMO_USERS, ensureDemoUsers } from "../src/lib/current-user";

const prisma = new PrismaClient();

type SeedPQ = {
  pqNo: string;
  defaults: {
    statusOfImplementation: string | null;
    mainResponsibility: string | null;
    partResponsibility: string | null;
    // PEL sub-area responsible-person names (Sheet1 K..P).
    fcl: string | null;
    aw: string | null;
    atc: string | null;
    med: string | null;
    foo: string | null;
    sms: string | null;
    workRequired: string | null;
    briefOnWorkRequired: string | null;
  };
  sourceMeta?: {
    extraNotes: string[];
    progressPct: number | null;
  };
};

type SeedFile = {
  metadata: { audit_area: string };
  pqs: SeedPQ[];
};

type SourceField = keyof SeedPQ["defaults"];

const FIELD_MAP: Array<{ source: SourceField; key: FieldKey }> = [
  { source: "statusOfImplementation", key: "STATUS_OF_IMPLEMENTATION" },
  { source: "mainResponsibility", key: "MAIN_RESPONSIBILITY" },
  { source: "partResponsibility", key: "PART_RESPONSIBILITY" },
  { source: "fcl", key: "FCL" },
  { source: "aw", key: "AW" },
  { source: "atc", key: "ATC" },
  { source: "med", key: "MED" },
  { source: "foo", key: "FOO" },
  { source: "sms", key: "SMS" },
  { source: "workRequired", key: "WORK_REQUIRED" },
  { source: "briefOnWorkRequired", key: "BRIEF_ON_WORK_REQUIRED" },
];

// Sentinel user used when the source workbook does NOT map the entry to
// a known person. Authorship of the row technically lives on this user
// (for FK integrity) but the UI prefers `authorLabel` or the "Initial
// input" fallback for display.
const IMPORT_USER = {
  id: "user_system_import",
  email: "import@ocaa.om",
  name: "Source workbook import",
  role: "EDITOR" as const,
};

// Names we should collapse onto the real admin demo user so the rows
// get the proper admin styling and name ("Asim Mairaj"). Matched
// case-insensitively against the raw token from the workbook.
const ADMIN_ALIASES = new Set(["asim", "asim mairaj"]);

function isBlank(v: string | null | undefined) {
  return v === null || v === undefined || v.trim() === "";
}

// Resolves a raw attribution string from the workbook to either the
// real admin user (if it matches an ADMIN_ALIAS) or the import sentinel
// with an optional authorLabel override.
function resolveAttribution(raw: string | null | undefined): {
  authorId: string;
  authorLabel: string | null;
} {
  if (!raw || raw.trim() === "") {
    return { authorId: IMPORT_USER.id, authorLabel: null };
  }
  const trimmed = raw.trim();
  if (ADMIN_ALIASES.has(trimmed.toLowerCase())) {
    return { authorId: ADMIN_USER_ID, authorLabel: null };
  }
  return { authorId: IMPORT_USER.id, authorLabel: trimmed };
}

// Parses a column-T notes blob into discrete entries. Input looks like:
//   "1. CAR ORA amendements ... (Imtiaz)
//    2. CAR FCL ... (Imtiaz)"
// Some cells have a single line without a leading number. Each returned
// entry carries the detected parenthetical author (null if none).
function parseNotes(rawList: string[]): Array<{
  text: string;
  author: string | null;
}> {
  const out: Array<{ text: string; author: string | null }> = [];
  for (const raw of rawList) {
    // Whitespace flattening: the source uses huge runs of spaces
    // between entries. Collapse them before splitting.
    const flat = raw.replace(/\s+/g, " ").trim();
    if (!flat) continue;

    // Split on a numbered prefix ("1.", "2.", …) when present. If none,
    // treat the whole cell as a single entry.
    const parts = flat.match(/(?:^|\s)(\d+)\.\s+[^]*?(?=(?:\s+\d+\.\s+)|$)/g);
    const entries = parts && parts.length > 0 ? parts : [flat];

    for (const p of entries) {
      // Strip leading number
      const cleaned = p.replace(/^\s*\d+\.\s+/, "").trim();
      if (!cleaned) continue;
      // Extract the LAST parenthetical expression, which by convention
      // in this workbook is the author name. Tolerate trailing
      // punctuation after the closing paren ("(Asim).", "(Malka);")
      // which appears in several rows.
      const m = cleaned.match(/^(.*)\(([^)]+)\)[\s.,;:·]*$/s);
      const author = m ? m[2].trim() : null;
      const text = m ? m[1].trim().replace(/[.,;:\s]+$/, "") : cleaned;
      if (text) out.push({ text, author });
    }
  }
  return out;
}

// Maps normalized progress % to a PQStatus. Returns null when there is
// nothing to change (no progress AND no submissions created).
function inferStatus(
  progressPct: number | null,
  wroteAny: boolean
): Status | null {
  if (progressPct != null) {
    if (progressPct >= 100) return "COMPLETE";
    return "UNDER_REVIEW";
  }
  return wroteAny ? "IN_PROGRESS" : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const seedPath = path.join(process.cwd(), "data", "pel-pqs.json");
  const data: SeedFile = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const bySeedPq = new Map(data.pqs.map((p) => [p.pqNo, p]));

  // Bring up demo users (admin + editors) so we can attribute Asim
  // entries to the real admin user.
  await ensureDemoUsers();

  // Import sentinel alongside the demo roster.
  await prisma.user.upsert({
    where: { id: IMPORT_USER.id },
    update: {
      email: IMPORT_USER.email,
      name: IMPORT_USER.name,
      role: IMPORT_USER.role,
    },
    create: IMPORT_USER,
  });

  const rows = await prisma.protocolQuestion.findMany({
    select: { id: true, pqNo: true, status: true },
  });

  const existing = await prisma.fieldSubmission.findMany({
    where: { pqId: { in: rows.map((r) => r.id) } },
    select: { pqId: true, fieldKey: true },
  });
  const occupied = new Map<string, Set<FieldKey>>();
  for (const s of existing) {
    const set = occupied.get(s.pqId) ?? new Set<FieldKey>();
    set.add(s.fieldKey);
    occupied.set(s.pqId, set);
  }

  let pqsTouched = 0;
  let submissionsCreated = 0;
  let statusesUpdated = 0;
  const fieldWrites: Record<FieldKey, number> = {
    STATUS_OF_IMPLEMENTATION: 0,
    MAIN_RESPONSIBILITY: 0,
    PART_RESPONSIBILITY: 0,
    FCL: 0,
    AW: 0,
    ATC: 0,
    MED: 0,
    FOO: 0,
    SMS: 0,
    WORK_REQUIRED: 0,
    BRIEF_ON_WORK_REQUIRED: 0,
    INTERNAL_NOTES: 0,
    OCAA_FINAL_RESPONSE: 0,
  };
  const attributionCounts = {
    admin: 0,
    labeled: 0,
    unattributed: 0,
  };

  // Constant timestamp so every initial row has the same "Initial" marker
  // in the DB even though the UI hides the relative time. Using a
  // recognizable sentinel (1970-01-01) also makes these rows easy to
  // select for reset operations if ever needed.
  const INITIAL_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");

  for (const row of rows) {
    const seed = bySeedPq.get(row.pqNo);
    if (!seed) continue;

    const occ = occupied.get(row.id) ?? new Set<FieldKey>();
    const meta = seed.sourceMeta ?? {
      extraNotes: [],
      progressPct: null,
    };

    const toCreate: Array<{
      fieldKey: FieldKey;
      seq: number;
      value: string;
      authorId: string;
      authorLabel: string | null;
    }> = [];

    // One submission per non-empty default field. The source workbook
    // carries no author for these, so they all get the unattributed
    // sentinel (UI renders "Initial input").
    for (const { source, key } of FIELD_MAP) {
      if (occ.has(key)) continue;
      const v = seed.defaults[source];
      if (isBlank(v)) continue;
      toCreate.push({
        fieldKey: key,
        seq: 1,
        value: (v as string).trim(),
        authorId: IMPORT_USER.id,
        authorLabel: null,
      });
    }

    // Each entry in column T becomes its own INTERNAL_NOTES submission.
    // seq starts at 1 and increments; if this field slot is already
    // occupied we skip entirely (the thread is considered "taken" by
    // whatever the user has since added). Parenthetical author names
    // are preserved: "Asim" routes to the real admin, every other name
    // becomes an authorLabel override on the sentinel user.
    if (!occ.has("INTERNAL_NOTES")) {
      const notes = parseNotes(meta.extraNotes);
      let seq = 1;
      for (const n of notes) {
        const attr = resolveAttribution(n.author);
        toCreate.push({
          fieldKey: "INTERNAL_NOTES",
          seq: seq++,
          value: n.text,
          authorId: attr.authorId,
          authorLabel: attr.authorLabel,
        });
      }
    }

    if (toCreate.length === 0) continue;

    pqsTouched += 1;

    const targetStatus = inferStatus(meta.progressPct, true);
    const shouldChangeStatus =
      targetStatus != null && row.status !== targetStatus;

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const c of toCreate) {
          await tx.fieldSubmission.create({
            data: {
              pqId: row.id,
              fieldKey: c.fieldKey,
              seq: c.seq,
              value: c.value,
              authorId: c.authorId,
              authorLabel: c.authorLabel,
              revisesIdsJson: "[]",
              isInitial: true,
              createdAt: INITIAL_TIMESTAMP,
            },
          });
        }
        if (shouldChangeStatus) {
          await tx.protocolQuestion.update({
            where: { id: row.id },
            data: { status: targetStatus, updatedById: IMPORT_USER.id },
          });
          await tx.statusHistory.create({
            data: {
              pqId: row.id,
              fromStatus: row.status,
              toStatus: targetStatus,
              note: `Initial import from source workbook (V column=${meta.progressPct ?? "n/a"})`,
              changedById: IMPORT_USER.id,
            },
          });
        }
      });
    }

    for (const c of toCreate) {
      fieldWrites[c.fieldKey] += 1;
      submissionsCreated += 1;
      if (c.authorId === ADMIN_USER_ID) attributionCounts.admin += 1;
      else if (c.authorLabel) attributionCounts.labeled += 1;
      else attributionCounts.unattributed += 1;
    }
    if (shouldChangeStatus) statusesUpdated += 1;
  }

  const prefix = dryRun ? "[dry run] " : "";
  console.log(
    `${prefix}Template import for audit area ${data.metadata.audit_area}:`
  );
  console.log(`  PQs scanned:                  ${rows.length}`);
  console.log(`  PQs written to:               ${pqsTouched}`);
  console.log(`  Submissions created:          ${submissionsCreated}`);
  console.log(`    attributed to admin (Asim): ${attributionCounts.admin}`);
  console.log(`    labeled (non-admin name):   ${attributionCounts.labeled}`);
  console.log(`    unattributed ("Initial"):   ${attributionCounts.unattributed}`);
  console.log(`  Status auto-transitions:      ${statusesUpdated}`);
  console.log("  Field write counts:");
  for (const key of Object.keys(fieldWrites) as FieldKey[]) {
    const n = fieldWrites[key];
    if (n > 0) console.log(`    ${key.padEnd(26)} ${n}`);
  }
  console.log(
    `  Sentinel user:                ${IMPORT_USER.name} (${IMPORT_USER.id})`
  );
  console.log(
    `  Admin mapped user:            ${DEMO_USERS[0].name} (${ADMIN_USER_ID})`
  );
  if (dryRun) {
    console.log("\nDry run only. Re-run without --dry-run to apply.");
  } else {
    console.log(
      "\nDone. Initial rows are protected: admins must revise them, not delete."
    );
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
