import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Status } from "@prisma/client";
import type { ProgressSummary } from "./types";
import { STATUS_ORDER } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Compute progress stats from a flat list of statuses.
export function summarize(statuses: Status[]): ProgressSummary {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  for (const s of statuses) byStatus[s] += 1;
  const total = statuses.length;
  const completePct = total === 0 ? 0 : Math.round((byStatus.COMPLETE / total) * 100);
  return { total, byStatus, completePct };
}
