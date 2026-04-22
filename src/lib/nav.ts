// Shared navigation model for the authenticated shell.
//
// Both the sidebar and the Flight Safety Department matrix render from this
// tree, which means adding a new Activity or Section is a one-line change that
// propagates everywhere. `href` being present means the leaf is wired up; absent
// means placeholder (shown disabled in UI).

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileCheck2,
  Gauge,
  Plane,
  ShieldCheck,
  Wrench,
  ListTree,
  BookOpen,
} from "lucide-react";

export type SectionId = "pel" | "ops" | "aw";

export type Section = {
  id: SectionId;
  label: string;
  annexLabel: string; // e.g. "ANNEX 1"
  annexNumber: number;
};

// The three Sections are a property of each Activity and are always the same
// three, so we render them consistently across every Activity card.
export const SECTIONS: Section[] = [
  {
    id: "pel",
    label: "Personnel Licensing",
    annexLabel: "ANNEX 1",
    annexNumber: 1,
  },
  {
    id: "ops",
    label: "Operation of Aircraft",
    annexLabel: "ANNEX 6 (all)",
    annexNumber: 6,
  },
  {
    id: "aw",
    label: "Airworthiness",
    annexLabel: "ANNEX 8",
    annexNumber: 8,
  },
];

export type ActivityId =
  | "usoap"
  | "surveillance"
  | "compliance"
  | "saaq"
  | "atoOrg";

export type Activity = {
  id: ActivityId;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  // Per-section wiring. `href` present means it's live; absent means placeholder.
  sectionHref: Partial<Record<SectionId, string>>;
};

export const ACTIVITIES: Activity[] = [
  {
    id: "usoap",
    label: "USOAP CMA Management",
    sublabel: "Protocol Question tracker",
    icon: ClipboardList,
    sectionHref: {
      pel: "/usoap-pel",
    },
  },
  {
    id: "surveillance",
    label: "Surveillance Tracker",
    sublabel: "Inspections and findings",
    icon: Gauge,
    sectionHref: {},
  },
  {
    id: "compliance",
    label: "Compliance Checklist Tracker",
    sublabel: "State self-assessments",
    icon: FileCheck2,
    sectionHref: {},
  },
  {
    id: "saaq",
    label: "SAAQ Tracker",
    sublabel: "State Aviation Activity Questionnaire",
    icon: BookOpen,
    sectionHref: {},
  },
  {
    id: "atoOrg",
    label: "ATO / Organization Tracker",
    sublabel: "Approved training and maintenance orgs",
    icon: Plane,
    sectionHref: {},
  },
];

// Shorthand helpers.
export const SECTION_BY_ID: Record<SectionId, Section> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s])
) as Record<SectionId, Section>;

export const ACTIVITY_BY_ID: Record<ActivityId, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a])
) as Record<ActivityId, Activity>;

// Icons surfaced separately for the sidebar (avoids importing lucide-react in
// every consumer just to look up the right glyph).
export const SECTION_ICON: Record<SectionId, LucideIcon> = {
  pel: ShieldCheck,
  ops: Plane,
  aw: Wrench,
};

// Top-level sidebar tree. Kept tiny and explicit so the shell is readable at
// a glance. New Activities / Sections added above flow into this structure via
// the ACTIVITIES / SECTIONS arrays.
export const NAV_ROOT = {
  home: { label: "Flight Safety", href: "/flight-safety", icon: ListTree },
} as const;
