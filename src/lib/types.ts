import type { ProtocolQuestion, Status } from "@prisma/client";

// PQ as returned from the DB has JSON-encoded guidance/references strings.
// Use `hydratePQ` to convert into this nicer shape for client code.
export type HydratedPQ = Omit<ProtocolQuestion, "guidanceJson" | "icaoReferencesJson"> & {
  guidance: string[];
  icaoReferences: string[];
};

export function hydratePQ(pq: ProtocolQuestion): HydratedPQ {
  const { guidanceJson, icaoReferencesJson, ...rest } = pq;
  return {
    ...rest,
    guidance: safeParseArray(guidanceJson),
    icaoReferences: safeParseArray(icaoReferencesJson),
  };
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Aggregates shown on the dashboard and CE pages.
export type ProgressSummary = {
  total: number;
  byStatus: Record<Status, number>;
  completePct: number;
};

export type CESummary = {
  ce: string;
  description: string;
  pqCount: number;
  ppqCount: number;
  progress: ProgressSummary;
};
