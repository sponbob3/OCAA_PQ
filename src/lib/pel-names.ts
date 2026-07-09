// Server-side helper used by the PQ detail page and the names API.
// Returns the distinct, normalized list of names that have ever
// appeared as a PEL sub-area submission value. The PQ page passes this
// straight into the panel so the admin's name typeahead is populated
// without an extra fetch on the client.

import { prisma } from "@/lib/db";
import { PEL_SUB_AREA_FIELD_KEYS } from "@/lib/pel";

const MAX_NAME_LEN = 80;

export async function listPelSubAreaNames(): Promise<string[]> {
  const rows = await prisma.fieldSubmission.findMany({
    where: { fieldKey: { in: PEL_SUB_AREA_FIELD_KEYS } },
    select: { value: true },
    distinct: ["value"],
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const v = (r.value ?? "").trim();
    if (!v) continue;
    if (v.length > MAX_NAME_LEN) continue;
    const normalized = v.replace(/\s+/g, " ");
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
