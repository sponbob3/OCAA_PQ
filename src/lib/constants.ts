import type { Status } from "@prisma/client";

export const AUDIT_AREA = "PEL";
export const AUDIT_AREA_FULL = "Personnel Licensing";

export const CE_DESCRIPTIONS: Record<string, string> = {
  "CE-1": "Primary aviation legislation",
  "CE-2": "Specific operating regulations",
  "CE-3": "State system and functions",
  "CE-4": "Qualified technical personnel",
  "CE-5": "Technical guidance, tools and safety-critical information",
  "CE-6": "Licensing, certification, authorization and approval",
  "CE-7": "Surveillance obligations",
  "CE-8": "Resolution of safety concerns",
};

// Status chip tokens are tuned for the dark ink base. Each chip is a
// tinted-glass pill: a low-alpha fill, a slightly stronger border, and a
// 300-weight text shade for legibility without shouting.
export const STATUS_META: Record<
  Status,
  { label: string; color: string; bg: string; border: string; order: number }
> = {
  NOT_STARTED: {
    label: "Not started",
    color: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-400/25",
    order: 0,
  },
  IN_PROGRESS: {
    label: "In progress",
    color: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-400/30",
    order: 1,
  },
  NEEDS_WORK: {
    label: "Needs work",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    order: 2,
  },
  UNDER_REVIEW: {
    label: "Under review",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-400/30",
    order: 3,
  },
  COMPLETE: {
    label: "Complete",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/40",
    order: 4,
  },
};

export const STATUS_ORDER: Status[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "NEEDS_WORK",
  "UNDER_REVIEW",
  "COMPLETE",
];

// The four PEL sub-areas (columns J-M in the source sheet).
export const PEL_SUBAREAS = [
  { key: "fcl", label: "FCL", full: "Flight Crew Licensing" },
  { key: "aw", label: "AW", full: "Airworthiness personnel" },
  { key: "atc", label: "ATC", full: "Air Traffic Controllers" },
  { key: "med", label: "MED", full: "Medical" },
] as const;
