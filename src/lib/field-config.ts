// Display configuration for each threaded PQ response field.
//
// Adding a new field is three steps:
//   1. Add the enum value to FieldKey in schema.prisma + migrate.
//   2. Add an entry here.
//   3. (Optional) Add a section label in SECTION_GROUPS below.

import type { FieldKey } from "@prisma/client";

export type FieldMode = "block" | "inline";

export type FieldConfig = {
  key: FieldKey;
  label: string;
  sublabel?: string;
  placeholder?: string;
  mode: FieldMode;
  // Number of textarea rows when drafting; only meaningful for block mode.
  composerRows?: number;
};

export const FIELD_CONFIG: Record<FieldKey, FieldConfig> = {
  STATUS_OF_IMPLEMENTATION: {
    key: "STATUS_OF_IMPLEMENTATION",
    label: "Status of implementation",
    placeholder: "e.g. Satisfactory. To be reviewed for amendment.",
    mode: "block",
    composerRows: 3,
  },
  MAIN_RESPONSIBILITY: {
    key: "MAIN_RESPONSIBILITY",
    label: "Main PQ responsibility",
    placeholder: "e.g. PEL",
    mode: "inline",
  },
  PART_RESPONSIBILITY: {
    key: "PART_RESPONSIBILITY",
    label: "Part responsibility",
    placeholder: "e.g. SRD",
    mode: "inline",
  },
  // The six PEL sub-area fields carry the name of the OCAA person
  // responsible for that sub-area on this PQ. They're single-line by
  // nature (just a name), so render as inline. The composer accepts
  // multi-line input if ever needed for a short note alongside the name.
  FCL: {
    key: "FCL",
    label: "FCL",
    sublabel: "Flight Crew Licensing",
    placeholder: "Responsible person (e.g. Imtiaz)",
    mode: "inline",
  },
  AW: {
    key: "AW",
    label: "AW",
    sublabel: "Airworthiness personnel",
    placeholder: "Responsible person",
    mode: "inline",
  },
  ATC: {
    key: "ATC",
    label: "ATC",
    sublabel: "Air Traffic Controllers",
    placeholder: "Responsible person",
    mode: "inline",
  },
  MED: {
    key: "MED",
    label: "MED",
    sublabel: "Medical",
    placeholder: "Responsible person",
    mode: "inline",
  },
  FOO: {
    key: "FOO",
    label: "FOO",
    sublabel: "Flight Operations Officer / Dispatcher",
    placeholder: "Responsible person",
    mode: "inline",
  },
  SMS: {
    key: "SMS",
    label: "SMS",
    sublabel: "Safety Management Systems",
    placeholder: "Responsible person",
    mode: "inline",
  },
  WORK_REQUIRED: {
    key: "WORK_REQUIRED",
    label: "Work required (recommendations)",
    placeholder: "Summary of work needed...",
    mode: "block",
    composerRows: 4,
  },
  BRIEF_ON_WORK_REQUIRED: {
    key: "BRIEF_ON_WORK_REQUIRED",
    label: "Brief on the work required",
    placeholder: "Narrative response and evidence description...",
    mode: "block",
    composerRows: 6,
  },
  INTERNAL_NOTES: {
    key: "INTERNAL_NOTES",
    label: "Internal notes",
    sublabel: "Not submitted to ICAO. For OCAA internal use.",
    placeholder: "Internal-only context, coordination notes, blockers...",
    mode: "block",
    composerRows: 4,
  },
  OCAA_FINAL_RESPONSE: {
    key: "OCAA_FINAL_RESPONSE",
    label: "OCAA final response",
    sublabel: "The response OCAA stands behind for this PQ",
    placeholder: "Final consolidated response, ready for submission...",
    mode: "block",
    composerRows: 6,
  },
};

// Render order and grouping on the PQ detail page.
export const SECTION_GROUPS: Array<{
  title: string;
  fields: FieldKey[];
  layout?: "single" | "pair" | "quad";
}> = [
  {
    title: "Response",
    fields: ["STATUS_OF_IMPLEMENTATION"],
    layout: "single",
  },
  {
    title: "Responsibility",
    fields: ["MAIN_RESPONSIBILITY", "PART_RESPONSIBILITY"],
    layout: "pair",
  },
  {
    title: "PEL sub-area responsibility",
    fields: ["FCL", "AW", "ATC", "MED", "FOO", "SMS"],
    layout: "quad",
  },
  {
    title: "Work and narrative",
    fields: ["WORK_REQUIRED", "BRIEF_ON_WORK_REQUIRED"],
    layout: "single",
  },
  {
    title: "Internal notes",
    fields: ["INTERNAL_NOTES"],
    layout: "single",
  },
  {
    title: "OCAA final response",
    fields: ["OCAA_FINAL_RESPONSE"],
    layout: "single",
  },
];

export function fieldConfig(key: FieldKey): FieldConfig {
  return FIELD_CONFIG[key];
}
