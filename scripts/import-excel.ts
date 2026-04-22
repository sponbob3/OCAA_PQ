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

  // cellStyles: true preserves fill colors so we can detect the yellow
  // highlighting on "Sheet1" columns U/V that marks a PQ as ATC-relevant.
  const wb = XLSX.readFile(SOURCE_XLSX, { cellStyles: true });
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

  // Sheet1 carries per-PQ metadata that isn't in the primary "PEL PQs"
  // sheet:
  //   - Columns U/V: yellow fill (FFFF00) marks PQs as ATC-relevant.
  //   - Columns K..P: a merged-header block labeled "Responsible PEL
  //                 Area" with sub-headers on row 2:
  //                     K=FCL  L=AW  M=ATC  N=MED  O=FOO  P=SMS
  //                 Each cell holds the name of the OCAA person
  //                 responsible for that sub-area on this PQ.
  //                 (The primary "PEL PQs" sheet has FCL/AW/ATC/MED as
  //                 headers in columns J..M too, but the data cells
  //                 there are blank - the real data lives here.)
  //   - Column T:   free-form internal notes, sometimes multi-entry
  //                 with parenthetical authors like "(Imtiaz)".
  //   - Column V value (number):  completion %, encoded either as a
  //                 fraction (0.8, 1) or whole percent (80, 100).
  // We walk Sheet1 once, forward-fill the PQ number from column B, and
  // gather all of these per PQ. Continuation rows (blank B) still count
  // toward the current PQ.
  const atcPQs = new Set<string>();
  const notesByPQ = new Map<string, string[]>();
  const progressByPQ = new Map<string, number>();
  // Per-PQ responsible-person names for each PEL sub-area.
  type PelArea = {
    fcl: string | null;
    aw: string | null;
    atc: string | null;
    med: string | null;
    foo: string | null;
    sms: string | null;
  };
  const pelAreaByPQ = new Map<string, PelArea>();

  const SUB_AREA_COLS: Array<{ col: string; key: keyof PelArea }> = [
    { col: "K", key: "fcl" },
    { col: "L", key: "aw" },
    { col: "M", key: "atc" },
    { col: "N", key: "med" },
    { col: "O", key: "foo" },
    { col: "P", key: "sms" },
  ];

  const secondary = wb.Sheets["Sheet1"];
  if (secondary) {
    const range = XLSX.utils.decode_range(secondary["!ref"] ?? "A1:A1");
    let pq: string | null = null;
    // Skip the first two rows: row 1 is the merged header, row 2 is the
    // sub-header names. Data starts on row 3 (index 2).
    for (let rIdx = range.s.r + 2; rIdx <= range.e.r; rIdx++) {
      const pqCell = secondary[`B${rIdx + 1}`] as XLSX.CellObject | undefined;
      if (
        pqCell &&
        pqCell.v !== null &&
        pqCell.v !== undefined &&
        String(pqCell.v).trim() !== ""
      ) {
        const n = Number(pqCell.v);
        if (!Number.isNaN(n)) pq = n.toFixed(3);
      }
      if (!pq) continue;

      for (const col of ["U", "V"] as const) {
        const cell = secondary[col + (rIdx + 1)] as XLSX.CellObject | undefined;
        const rgb = (cell as unknown as { s?: { fgColor?: { rgb?: string } } })
          ?.s?.fgColor?.rgb;
        if (rgb && rgb.toUpperCase() === "FFFF00") {
          atcPQs.add(pq);
          break;
        }
      }

      // Collect PEL sub-area responsible-person names, first non-blank
      // cell wins per (pq, sub-area) since continuation rows sometimes
      // repeat the same value.
      let area = pelAreaByPQ.get(pq);
      if (!area) {
        area = {
          fcl: null,
          aw: null,
          atc: null,
          med: null,
          foo: null,
          sms: null,
        };
        pelAreaByPQ.set(pq, area);
      }
      for (const { col, key } of SUB_AREA_COLS) {
        if (area[key] != null) continue;
        const cell = secondary[col + (rIdx + 1)] as XLSX.CellObject | undefined;
        const v = clean(cell?.v);
        if (v) area[key] = v;
      }

      const tCell = secondary[`T${rIdx + 1}`] as XLSX.CellObject | undefined;
      const tVal = clean(tCell?.v);
      if (tVal) {
        const arr = notesByPQ.get(pq) ?? [];
        arr.push(tVal);
        notesByPQ.set(pq, arr);
      }

      const vCell = secondary[`V${rIdx + 1}`] as XLSX.CellObject | undefined;
      if (vCell && vCell.v != null && !progressByPQ.has(pq)) {
        const n = Number(vCell.v);
        if (!Number.isNaN(n)) {
          // Normalize: values at or below 1 are fractions (0.8 -> 80%,
          // 1 -> 100%). Everything else is already a percentage.
          const pct = n <= 1 ? Math.round(n * 100) : Math.round(n);
          progressByPQ.set(pq, pct);
        }
      }
    }
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

    const area = pelAreaByPQ.get(pqNo);

    pqs.push({
      pqNo,
      ce: clean(header["CE"]),
      question: clean(header["Protocol Question"]),
      guidance,
      icaoReferences: refs,
      isPPQ: clean(header["PPQ"]) === "PPQ",
      isATC: atcPQs.has(pqNo),
      amendmentDescription: clean(header["Description of Amendment"]),
      // Note: the PEL sub-area fields (fcl/aw/atc/med/foo/sms) are
      // intentionally NOT read from the primary sheet - those columns
      // exist there but are blank in every data row. The real names
      // come from Sheet1 via pelAreaByPQ.
      defaults: {
        statusOfImplementation: clean(header["Status of Implementation"]),
        mainResponsibility: clean(header["Main PQ responsibility"]),
        partResponsibility: clean(header["Part responsibility"]),
        fcl: area?.fcl ?? null,
        aw: area?.aw ?? null,
        atc: area?.atc ?? null,
        med: area?.med ?? null,
        foo: area?.foo ?? null,
        sms: area?.sms ?? null,
        workRequired: clean(header["WORK REQUIRED (Reccomendations)"]),
        briefOnWorkRequired: clean(header["BRIEF ON THE WORK REQUIRED (Reccomendations)"]),
      },
      sourceMeta: {
        extraNotes: notesByPQ.get(pqNo) ?? [],
        progressPct:
          progressByPQ.has(pqNo) ? progressByPQ.get(pqNo)! : null,
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
      atc_count: pqs.filter((p) => p.isATC).length,
    },
    criticalElements,
    pqs,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${pqs.length} PQs to ${OUTPUT_JSON}`);
}

main();
