// Shared PEL sub-area logic.
//
// The set of "PEL sub-area" FieldKey values is treated specially across
// the app:
//   - Only admins can write submissions to these fields.
//   - Which sub-areas show up on a PQ is gated per-PQ by an explicit
//     admin-managed list stored on ProtocolQuestion.enabledPelSubAreasJson.
//
// This module centralizes the constants and a few helpers so the page,
// the API routes, and the import scripts agree on the same definition.

import type { FieldKey } from "@prisma/client";

// The canonical, ordered list of PEL sub-area FieldKey values. Order
// here is the order they appear in the UI.
export const PEL_SUB_AREA_FIELD_KEYS: FieldKey[] = [
  "FCL",
  "AW",
  "ATC",
  "MED",
  "FOO",
  "SMS",
  "RPL",
];

const PEL_SET = new Set<FieldKey>(PEL_SUB_AREA_FIELD_KEYS);

export function isPelSubAreaField(key: FieldKey): boolean {
  return PEL_SET.has(key);
}

// Parse the JSON stored on ProtocolQuestion.enabledPelSubAreasJson.
// Returns null when no explicit override is set, so callers can fall
// back to deriving the enabled set from existing submissions.
export function parseEnabledPelSubAreas(
  json: string | null | undefined
): FieldKey[] | null {
  if (!json || !json.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out: FieldKey[] = [];
  for (const v of parsed) {
    if (typeof v !== "string") continue;
    const key = v as FieldKey;
    if (PEL_SET.has(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

// Resolve the enabled set for a PQ, given:
//   - the persisted JSON on the row (may be null), and
//   - the list of FieldKeys that already have at least one submission.
// When the JSON is set we trust it. Otherwise we derive an initial
// enabled set from the existing submissions so PQs that pre-date this
// feature keep showing whatever sub-areas were already populated.
export function resolveEnabledPelSubAreas(
  json: string | null | undefined,
  submittedFieldKeys: Iterable<FieldKey>
): FieldKey[] {
  const parsed = parseEnabledPelSubAreas(json);
  if (parsed) return parsed;
  const derived = new Set<FieldKey>();
  for (const k of submittedFieldKeys) {
    if (PEL_SET.has(k)) derived.add(k);
  }
  return PEL_SUB_AREA_FIELD_KEYS.filter((k) => derived.has(k));
}

// Serialize an enabled set back to JSON for storage. The order is
// normalized to the canonical PEL_SUB_AREA_FIELD_KEYS order.
export function stringifyEnabledPelSubAreas(keys: FieldKey[]): string {
  const set = new Set(keys.filter((k) => PEL_SET.has(k)));
  return JSON.stringify(PEL_SUB_AREA_FIELD_KEYS.filter((k) => set.has(k)));
}
