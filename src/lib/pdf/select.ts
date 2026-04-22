// Server-side helpers that pick the exact submission / evidence rows
// used in the PDF. Kept separate from the renderer so they're easy to
// unit test and so the route handler can compose them cleanly.

import type { FieldKey, FieldSubmission, EvidenceLink } from "@prisma/client";

// Rule per field (Status of Implementation, OCAA Final Response):
//   1. If any submission for this field is approved, take the most
//      recently APPROVED one (highest approvedAt).
//   2. Otherwise, fall back to the most recently CREATED submission
//      (highest seq, which is also the top of the thread).
//   3. If there are no submissions at all, return null -> renderer
//      prints the pending placeholder.
export function pickFieldValue(
  submissions: FieldSubmission[],
  fieldKey: FieldKey
): FieldSubmission | null {
  const subs = submissions.filter((s) => s.fieldKey === fieldKey);
  if (subs.length === 0) return null;

  const approved = subs.filter((s) => s.approvedAt != null);
  if (approved.length > 0) {
    approved.sort(
      (a, b) =>
        (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0)
    );
    return approved[0];
  }

  return [...subs].sort((a, b) => b.seq - a.seq)[0];
}

// Only approved evidences are included in the PDF. We return them in
// the order they were approved (oldest first) so the numbered list
// reads chronologically.
export function pickApprovedEvidence(links: EvidenceLink[]): EvidenceLink[] {
  return links
    .filter((l) => l.approvedAt != null)
    .sort(
      (a, b) =>
        (a.approvedAt?.getTime() ?? 0) - (b.approvedAt?.getTime() ?? 0)
    );
}
