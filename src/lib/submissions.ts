// Non-client helpers for converting Prisma FieldSubmission rows into the
// SubmissionView shape consumed by <FieldThread/>. Lives outside the client
// component module so that server components can import it without pulling
// the whole React bundle across the boundary.

import type { Role } from "@prisma/client";

export type SubmissionView = {
  id: number;
  seq: number;
  value: string;
  revisesIds: number[];
  createdAt: string; // ISO
  author: { id: string; name: string | null; role: Role };
  // Optional display override. When set, UI renders this string as the
  // author name and does NOT grant admin styling even if an underlying
  // author row has Role.ADMIN.
  authorLabel: string | null;
  // Immutable template rows imported from the source workbook.
  isInitial: boolean;
  approvedAt: string | null;
  approvedBy: { id: string; name: string | null; role: Role } | null;
};

export function safeParseIds(json: string): number[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => Number.isInteger(n))
      : [];
  } catch {
    return [];
  }
}

export function toSubmissionView(row: {
  id: number;
  seq: number;
  value: string;
  revisesIdsJson: string;
  createdAt: Date;
  approvedAt: Date | null;
  author: { id: string; name: string | null; role: Role };
  authorLabel: string | null;
  isInitial: boolean;
  approvedBy: { id: string; name: string | null; role: Role } | null;
}): SubmissionView {
  return {
    id: row.id,
    seq: row.seq,
    value: row.value,
    revisesIds: safeParseIds(row.revisesIdsJson),
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    authorLabel: row.authorLabel,
    isInitial: row.isInitial,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    approvedBy: row.approvedBy,
  };
}
