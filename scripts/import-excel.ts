// Re-extracts data/pel-pqs.json from the source .xlsx file.
// Only needed if the ICAO source sheet changes. Normally you just run `npm run seed`.
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const SOURCE_XLSX = path.join(process.cwd(), "data", "PEL_PQs_ATC_14-04-26.xlsx");
const OUTPUT_JSON = path.join(process.cwd(), "data", "pel-pqs.json");

const CE_META: Record<string, string> = {
  "CE-1": "Primary aviation legislation",
  "CE-2": "Specific operating regulations",
  "CE-3": "State system and functions",
  "CE-4": "Qualified technical personnel",
  "CE-5": "Technical guidance, tools and safety-critical information",
  "CE-6": "Licensing, certification, authorization and approval",
  "CE-7": "Surveillance obligations",
  "CE-8": "Resolution of safety concerns",
};

type Row = Record<string, unknown>;

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function main() {
  if (!fs.existsSync(SOURCE_XLSX)) {
    console.error(`Source file not found: ${SOURCE_XLSX}`);
    console.error("Put the .xlsx in data/ and re-run.");
    process.exit(1);
  }

  const wb = XLSX.readFile(SOURCE_XLSX);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });

  // Forward-fill PQ number so sub-rows inherit their parent PQ.
  let currentPQ: string | null = null;
  const grouped = new Map<string, Row[]>();

  for (const r of rows) {
    const pqRaw = r["PQ No."];
    if (pqRaw !== null && pqRaw !== undefined && String(pqRaw).trim() !== "") {
      currentPQ = Number(pqRaw).toFixed(3);
    }
    if (!currentPQ) continue;
    if (!grouped.has(currentPQ)) grouped.set(currentPQ, []);
    grouped.get(currentPQ)!.push(r);
  }

  const pqs = [];
  for (const [pqNo, groupRows] of grouped.entries()) {
    const header = groupRows[0];

    const guidance = groupRows
      .map((r) => clean(r["Guidance for Review of Evidence"]))
      .filter((v): v is string => v !== null);

    const refs = groupRows
      .map((r) => clean(r["ICAO References"]))
      .filter((v): v is string => v !== null);

    pqs.push({
      pqNo,
      ce: clean(header["CE"]),
      question: clean(header["Protocol Question"]),
      guidance,
      icaoReferences: refs,
      isPPQ: clean(header["PPQ"]) === "PPQ",
      amendmentDescription: clean(header["Description of Amendment"]),
      defaults: {
        statusOfImplementation: clean(header["Status of Implementation"]),
        mainResponsibility: clean(header["Main PQ responsibility"]),
        partResponsibility: clean(header["Part responsibility"]),
        fcl: clean(header["FCL"]),
        aw: clean(header["AW"]),
        atc: clean(header["ATC"]),
        med: clean(header["MED"]),
        workRequired: clean(header["WORK REQUIRED (Reccomendations)"]),
        briefOnWorkRequired: clean(header["BRIEF ON THE WORK REQUIRED (Reccomendations)"]),
      },
    });
  }

  pqs.sort((a, b) => Number(a.pqNo) - Number(b.pqNo));

  const cesPresent = [...new Set(pqs.map((p) => p.ce).filter(Boolean))].sort() as string[];
  const criticalElements = cesPresent.map((ce) => ({
    id: ce,
    description: CE_META[ce] ?? "",
    pqCount: pqs.filter((p) => p.ce === ce).length,
    ppqCount: pqs.filter((p) => p.ce === ce && p.isPPQ).length,
  }));

  const output = {
    metadata: {
      audit_area: "PEL",
      audit_area_full: "Personnel Licensing",
      source_file: path.basename(SOURCE_XLSX),
      total_pqs: pqs.length,
      ppq_count: pqs.filter((p) => p.isPPQ).length,
    },
    criticalElements,
    pqs,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${pqs.length} PQs to ${OUTPUT_JSON}`);
}

main();
